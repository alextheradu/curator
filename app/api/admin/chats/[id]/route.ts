import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const { id } = await params;

  const [conv] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      userId: conversations.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ ...conv, messages: msgs });
}
