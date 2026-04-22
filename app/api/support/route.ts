import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { withDbAccessContext } from "@/lib/db/access";
import { supportRequests } from "@/lib/db/schema";
import { logAppEvent, captureException } from "@/lib/logging";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { revalidateAdminStatsCache } from "@/lib/cache-tags";

export async function POST(request: NextRequest) {
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

  const subject = body?.subject?.trim() ?? "";
  const message = body?.message?.trim() ?? "";
  const email = body?.email?.trim() ?? session?.user?.email ?? "";
  const name = body?.name?.trim() ?? session?.user?.name ?? "";

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400, headers });
  }

  if (message.length < 20) {
    return NextResponse.json({ error: "Please provide at least 20 characters of detail." }, { status: 400, headers });
  }

  try {
    const [created] = await withDbAccessContext({ userId: session?.user?.id ?? null }, (tx) => tx
      .insert(supportRequests)
      .values({
        userId: session?.user?.id ?? null,
        name: name || null,
        email: email || null,
        subject,
        message,
        pagePath: body?.pagePath?.trim() || null,
        userAgent: getUserAgent(request),
        ip,
      })
      .returning({ id: supportRequests.id }));

    await logAppEvent({
      level: "info",
      source: "support",
      message: `Support request created: ${subject}`,
      path: body?.pagePath ?? "/support",
      userId: session?.user?.id ?? null,
      ip,
      details: { supportRequestId: created.id },
    });

    revalidateAdminStatsCache();

    return NextResponse.json({ ok: true, id: created.id }, { headers });
  } catch (error) {
    await captureException("support", error, {
      path: body?.pagePath ?? "/support",
      userId: session?.user?.id ?? null,
      ip,
      details: { subject },
    });

    return NextResponse.json({ error: "Unable to send support request." }, { status: 500, headers });
  }
}
