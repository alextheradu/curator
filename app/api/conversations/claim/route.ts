import { auth } from "@/auth";
import { withDbAccessContext } from "@/lib/db/access";
import { conversations } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { deleteGuestSessionCookie, readGuestSessionId } from "@/lib/guest-session";
import { hasValidMutationOrigin } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guestId = await readGuestSessionId();
  if (!guestId) return NextResponse.json({ conversationIds: [] });

  const updated = await withDbAccessContext({ userId: session.user.id, guestId }, (tx) => tx
    .update(conversations)
    .set({ userId: session.user.id, guestId: null })
    .where(eq(conversations.guestId, guestId))
    .returning({ id: conversations.id }));

  const responseHeaders = new Headers();
  responseHeaders.set("Set-Cookie", deleteGuestSessionCookie());

  revalidateConversationDerivedCaches();
  return NextResponse.json(
    { conversationIds: updated.map((r) => r.id) },
    { headers: responseHeaders },
  );
}
