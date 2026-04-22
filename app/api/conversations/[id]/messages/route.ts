import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { messages, conversations } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { getCachedPublicConversationMessages, revalidatePublicConversation } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    const publicMessages = await getCachedPublicConversationMessages(id);
    if (!publicMessages) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(publicMessages);
  }

  const rows = await withSessionDbAccess(session, (tx) => tx.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt)));

  if (rows.length === 0) {
    const [conversation] = await withSessionDbAccess(session, (tx) => tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1));

    if (!conversation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = await enforceRequestRateLimit(req, "conversationMessageWrite", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
  }
  const { id } = await params;
  const { role, content, citations, id: msgId } = await req.json();

  const [conv] = await withSessionDbAccess(session, (tx) => tx.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .limit(1));
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [msg] = await withSessionDbAccess(session, (tx) => tx.insert(messages)
    .values({ ...(msgId ? { id: msgId } : {}), conversationId: id, role, content, citations })
    .returning());

  await withSessionDbAccess(session, (tx) => tx.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id)));

  revalidatePublicConversation(id);
  revalidateConversationDerivedCaches();
  return NextResponse.json(msg, { headers });
}
