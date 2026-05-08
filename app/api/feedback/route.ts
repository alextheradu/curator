import { auth } from "@/auth";
import { withDbAccessContext } from "@/lib/db/access";
import { appLogs } from "@/lib/db/schema";
import { applyRateLimitHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { NextRequest, NextResponse } from "next/server";

const FEEDBACK_KINDS = new Set(["helpful", "not_helpful", "bad_citation", "missed_source"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  const ip = getClientIp(req);
  const rateLimit = await enforceRateLimit({
    scope: "feedback",
    key: session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too much feedback submitted. Please slow down." }, { status: 429, headers });
  }

  const body = await req.json().catch(() => ({})) as { messageId?: string; kind?: string };
  if (!body.messageId || !body.kind || !FEEDBACK_KINDS.has(body.kind)) {
    return NextResponse.json({ error: "messageId and valid feedback kind are required" }, { status: 400, headers });
  }
  const kind = body.kind;

  await withDbAccessContext({ userId: session?.user?.id ?? "anonymous-feedback", isAdmin: true }, (tx) => tx
    .insert(appLogs)
    .values({
      level: "info",
      source: "feedback",
      message: kind,
      path: req.nextUrl.pathname,
      userId: session?.user?.id ?? null,
      ip,
      details: { messageId: body.messageId },
    }));

  return NextResponse.json({ ok: true }, { headers });
}
