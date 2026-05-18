import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withDbAccessContext } from "@/lib/db/access";
import { supportRequests } from "@/lib/db/schema";
import { logAppEvent, captureException } from "@/lib/logging";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { revalidateAdminStatsCache } from "@/lib/cache-tags";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { validateSupportRequestInput } from "@/lib/user-input-limits";

export async function POST(request: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(request);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  const ip = getClientIp(request);
  const rateLimit = await enforceRequestRateLimit(request, "support", session?.user?.id);

  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many support requests. Try again later." }, { status: 429, headers });
  }

  const body = await request.json().catch(() => null) as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    pagePath?: string;
  } | null;

  const validation = validateSupportRequestInput({
    name: body?.name ?? session?.user?.name,
    email: body?.email ?? session?.user?.email,
    subject: body?.subject,
    message: body?.message,
    pagePath: body?.pagePath,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400, headers });
  }
  const { subject, message, email, name, pagePath } = validation.value;

  try {
    const [created] = await withDbAccessContext({ userId: session?.user?.id ?? null }, (tx) => tx
      .insert(supportRequests)
      .values({
        userId: session?.user?.id ?? null,
        name: name || null,
        email: email || null,
        subject,
        message,
        pagePath: pagePath || null,
        userAgent: getUserAgent(request),
        ip,
      })
      .returning({ id: supportRequests.id }));

    await logAppEvent({
      level: "info",
      source: "support",
      message: `Support request created: ${subject}`,
      path: pagePath || "/support",
      userId: session?.user?.id ?? null,
      ip,
      details: { supportRequestId: created.id },
    });

    revalidateAdminStatsCache();

    return NextResponse.json({ ok: true, id: created.id }, { headers });
  } catch (error) {
    await captureException("support", error, {
      path: pagePath || "/support",
      userId: session?.user?.id ?? null,
      ip,
      details: { subject },
    });

    return NextResponse.json({ error: "Unable to send support request." }, { status: 500, headers });
  }
}
