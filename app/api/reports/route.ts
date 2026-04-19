import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const userAuth = await requireAuth(req);
  if (!userAuth.ok) return userAuth.response;

  const { messageId, reason } = await req.json() as { messageId: string; reason: string };
  if (!messageId || !reason?.trim()) {
    return NextResponse.json({ error: "messageId and reason are required" }, { status: 400 });
  }

  const [msg] = await db
    .select({ id: messages.id, conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // One report per user per message
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.messageId, messageId), eq(reports.reportedById, userAuth.userId)))
    .limit(1);
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409 });

  await db.insert(reports).values({
    conversationId: msg.conversationId,
    messageId,
    reportedById: userAuth.userId,
    reason: reason.trim(),
  });

  return NextResponse.json({ ok: true });
}
