import { sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { withSystemDbAccess } from "@/lib/db/access";
import { rateLimitBuckets } from "@/lib/db/schema";
import { getClientIp } from "@/lib/request-context";

type RateLimitOptions = {
  scope: string;
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetAt: Date;
};

type RateLimitBucketRow = {
  count: number;
  window_start: Date | string;
};

type RateLimitBucketWithCtidRow = RateLimitBucketRow & {
  ctid: string;
};

export const RATE_LIMIT_POLICIES = {
  chatAuthenticated: { scope: "chat", limit: 60, windowMs: 60 * 1000 },
  chatGuest: { scope: "chat", limit: 15, windowMs: 60 * 1000 },
  clientErrors: { scope: "client-errors", limit: 30, windowMs: 5 * 60 * 1000 },
  support: { scope: "support", limit: 5, windowMs: 60 * 60 * 1000 },
  report: { scope: "report", limit: 10, windowMs: 60 * 60 * 1000 },
  conversationCreate: { scope: "conversation-create", limit: 30, windowMs: 60 * 1000 },
  conversationMessageWrite: { scope: "conversation-message-write", limit: 120, windowMs: 60 * 1000 },
  conversationMutate: { scope: "conversation-mutate", limit: 60, windowMs: 60 * 1000 },
  conversationTitle: { scope: "conversation-title", limit: 30, windowMs: 60 * 60 * 1000 },
  documentAccess: { scope: "document-access", limit: 120, windowMs: 60 * 1000 },
  adminDocumentMutate: { scope: "admin-document-mutate", limit: 120, windowMs: 60 * 60 * 1000 },
  adminDocumentUpload: { scope: "admin-document-upload", limit: 12, windowMs: 60 * 60 * 1000 },
  adminDocumentDescribe: { scope: "admin-document-describe", limit: 60, windowMs: 60 * 60 * 1000 },
  adminReportMutate: { scope: "admin-report-mutate", limit: 120, windowMs: 60 * 60 * 1000 },
  adminUserMutate: { scope: "admin-user-mutate", limit: 60, windowMs: 60 * 60 * 1000 },
} as const;

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES;

export function getRateLimitKey(request: NextRequest | Request, userId?: string | null) {
  return userId ? `user:${userId}` : `ip:${getClientIp(request)}`;
}

export async function enforceRequestRateLimit(
  request: NextRequest | Request,
  policy: RateLimitPolicyName,
  userId?: string | null,
) {
  const config = RATE_LIMIT_POLICIES[policy];

  return enforceRateLimit({
    ...config,
    key: getRateLimitKey(request, userId),
  });
}

export async function enforceRateLimit({
  scope,
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  const resetThreshold = new Date(now.getTime() - windowMs);
  const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const nowIso = now.toISOString();
  const resetThresholdIso = resetThreshold.toISOString();
  const staleThresholdIso = staleThreshold.toISOString();
  const bucketKey = `${scope}:${key}`;

  let result: RateLimitBucketRow[];

  try {
    result = await withSystemDbAccess((tx) => tx.execute(sql`
      insert into ${rateLimitBuckets} ("key", "scope", "count", "window_start", "updated_at")
      values (
        ${bucketKey},
        ${scope},
        1,
        ${nowIso},
        ${nowIso}
      )
      on conflict ("key") do update set
        "count" = case
          when ${rateLimitBuckets.windowStart} <= ${resetThresholdIso} then 1
          else ${rateLimitBuckets.count} + 1
        end,
        "window_start" = case
          when ${rateLimitBuckets.windowStart} <= ${resetThresholdIso}
            then ${nowIso}
          else ${rateLimitBuckets.windowStart}
        end,
        "updated_at" = ${nowIso}
      returning "count", "window_start"
    `)) as RateLimitBucketRow[];
  } catch (error) {
    if (!isMissingRateLimitConflictConstraint(error)) {
      throw error;
    }

    result = await withSystemDbAccess(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${bucketKey}, 0))`);

      const existingRows = await tx.execute(sql`
        select ctid::text as "ctid", "count", "window_start"
        from ${rateLimitBuckets}
        where "key" = ${bucketKey}
        order by "updated_at" desc, "window_start" desc
      `) as RateLimitBucketWithCtidRow[];

      if (existingRows.length === 0) {
        return tx.execute(sql`
          insert into ${rateLimitBuckets} ("key", "scope", "count", "window_start", "updated_at")
          values (
            ${bucketKey},
            ${scope},
            1,
            ${nowIso},
            ${nowIso}
          )
          returning "count", "window_start"
        `) as Promise<RateLimitBucketRow[]>;
      }

      const [currentRow, ...duplicateRows] = existingRows;

      if (duplicateRows.length > 0) {
        await tx.execute(sql`
          delete from ${rateLimitBuckets}
          where ctid::text in (${sql.join(duplicateRows.map((row) => sql`${row.ctid}`), sql`, `)})
        `);
      }

      const currentWindowStart = new Date(currentRow.window_start);
      const shouldResetWindow = currentWindowStart <= resetThreshold;
      const nextCount = shouldResetWindow ? 1 : Number(currentRow.count) + 1;
      const nextWindowStart = shouldResetWindow ? now : currentWindowStart;

      return tx.execute(sql`
        update ${rateLimitBuckets}
        set
          "count" = ${nextCount},
          "window_start" = ${nextWindowStart.toISOString()},
          "updated_at" = ${nowIso}
        where ctid = ${currentRow.ctid}::tid
        returning "count", "window_start"
      `) as Promise<RateLimitBucketRow[]>;
    });
  }

  const row = result[0] as RateLimitBucketRow;
  const used = Number(row.count ?? 0);
  const resetAt = new Date(new Date(row.window_start).getTime() + windowMs);
  const remaining = Math.max(0, limit - used);
  const retryAfter = Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));

  if (Math.random() < 0.02) {
    void withSystemDbAccess((tx) => tx
      .delete(rateLimitBuckets)
      .where(sql`${rateLimitBuckets.updatedAt} < ${staleThresholdIso}`));
  }

  return {
    ok: used <= limit,
    limit,
    remaining,
    retryAfter,
    resetAt,
  };
}

export function applyRateLimitHeaders(headers: Headers, result: RateLimitResult) {
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(Math.floor(result.resetAt.getTime() / 1000)));

  if (!result.ok) {
    headers.set("Retry-After", String(result.retryAfter));
  }
}

function isMissingRateLimitConflictConstraint(error: unknown) {
  return error instanceof Error
    && /no unique or exclusion constraint matching the ON CONFLICT specification/i.test(error.message);
}
