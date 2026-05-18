import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { deleteGuestSessionCookie, readGuestSessionId } from "@/lib/guest-session";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const guestId = await readGuestSessionId();
  if (!guestId) return NextResponse.json({ conversationIds: [] });

  const updated = await db
    .update(conversations)
    .set({ userId: session.user.id, guestId: null })
    .where(eq(conversations.guestId, guestId))
    .returning({ id: conversations.id });

  const responseHeaders = new Headers();
  responseHeaders.set("Set-Cookie", deleteGuestSessionCookie());

  revalidateConversationDerivedCaches();
  return NextResponse.json(
    { conversationIds: updated.map((r) => r.id) },
    { headers: responseHeaders },
  );
}
