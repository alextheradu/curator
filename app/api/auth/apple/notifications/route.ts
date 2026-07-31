import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { accounts } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { verifyAppleJwt } from "@/lib/apple-jwt";
import { deleteUserAccountData } from "@/lib/account-deletion";
import { logAppEvent } from "@/lib/logging";

type AppleNotificationEvent = {
  type?: string;
  sub?: string;
};

// Apple POSTs { payload: "<JWS>" }, signed the same way as native identity
// tokens. There's no shared secret or origin header to check here — the JWS
// signature against Apple's JWKS is the entire auth boundary, so an
// unverified payload must never reach account deletion below.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { payload?: string } | null;
  const payload = body?.payload;
  if (typeof payload !== "string" || !payload) {
    return NextResponse.json({ error: "Bad Request" }, { status: 400 });
  }

  const claims = await verifyAppleJwt(payload);
  if (!claims) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventsRaw = claims.events;
  const events = typeof eventsRaw === "string"
    ? JSON.parse(eventsRaw) as AppleNotificationEvent
    : null;

  if (!events?.type || !events.sub) {
    return NextResponse.json({ ok: true });
  }

  const [linkedAccount] = await db
    .select({ userId: accounts.userId })
    .from(accounts)
    .where(and(eq(accounts.provider, "apple"), eq(accounts.providerAccountId, events.sub!)))
    .limit(1);

  if (!linkedAccount) {
    return NextResponse.json({ ok: true });
  }

  switch (events.type) {
    case "account-delete":
      await deleteUserAccountData(linkedAccount.userId);
      break;
    case "consent-revoked":
      await db
        .delete(accounts)
        .where(and(eq(accounts.provider, "apple"), eq(accounts.providerAccountId, events.sub!)));
      break;
    default:
      await logAppEvent({
        level: "info",
        source: "apple-notifications",
        message: `apple notification: ${events.type}`,
        userId: linkedAccount.userId,
      });
  }

  return NextResponse.json({ ok: true });
}
