import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, conversations, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const rows = await db
    .select({
      id: reports.id,
      status: reports.status,
      reason: reports.reason,
      createdAt: reports.createdAt,
      conversationId: reports.conversationId,
      conversationTitle: conversations.title,
      messageId: reports.messageId,
      reporterName: users.name,
      reporterEmail: users.email,
    })
    .from(reports)
    .innerJoin(conversations, eq(reports.conversationId, conversations.id))
    .innerJoin(users, eq(reports.reportedById, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
