import { auth } from "@/auth";
import { db } from "@/lib/db";
import { messages, conversations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const [conv] = await db.select().from(conversations)
    .where(eq(conversations.id, id));
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = session?.user?.id === conv.userId;
  if (!isOwner && !conv.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { role, content, citations } = await req.json();

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)));
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [msg] = await db.insert(messages)
    .values({ conversationId: id, role, content, citations })
    .returning();

  await db.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));

  return NextResponse.json(msg);
}
