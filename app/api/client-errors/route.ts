import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAppEvent } from "@/lib/logging";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";

export async function POST(request: NextRequest) {
  const session = await auth();
  const rateLimit = await enforceRequestRateLimit(request, "clientErrors", session?.user?.id);
  const ip = getClientIp(request);

  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);

  if (!rateLimit.ok) {
    return new NextResponse(null, { status: 202, headers });
  }

  const body = await request.json().catch(() => null) as {
    message?: string;
    stack?: string;
    url?: string;
    kind?: string;
  } | null;

  if (!body?.message?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400, headers });
  }

  await logAppEvent({
    level: "error",
    source: "client",
    message: body.message.trim(),
    path: body.url ?? null,
    userId: session?.user?.id ?? null,
    ip,
    details: {
      kind: body.kind ?? "client_error",
      stack: body.stack ?? null,
    },
  });

  return new NextResponse(null, { status: 204, headers });
}
