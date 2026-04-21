import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, conversations, messages, documents, docChunks, reports } from "@/lib/db/schema";
import { eq, gte, count, sum, sql } from "drizzle-orm";
import { getCollectionInfo } from "@/lib/qdrant";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    [totalUsers],
    [newUsers7d],
    [newUsers30d],
    [totalConversations],
    [activeToday],
    [totalMessages],
    [messages7d],
    topUsers,
    [pendingReports],
    [totalDocs],
    docStats,
    [totalChunks],
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(conversations),
    db.select({ count: count() }).from(conversations).where(gte(conversations.updatedAt, todayStart)),
    db.select({ count: count() }).from(messages),
    db.select({ count: count() }).from(messages).where(gte(messages.createdAt, sevenDaysAgo)),
    db
      .select({
        name: users.name,
        email: users.email,
        msgCount: count(),
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(users, eq(conversations.userId, users.id))
      .groupBy(users.id, users.name, users.email)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db.select({ count: count() }).from(reports).where(eq(reports.status, "pending")),
    db.select({ count: count() }).from(documents),
    db
      .select({
        scope: documents.scope,
        docCount: count(),
        totalPages: sum(documents.pageCount),
      })
      .from(documents)
      .groupBy(documents.scope),
    db.select({ count: count() }).from(docChunks),
  ]);

  let qdrantCount = 0;
  try {
    const info = await getCollectionInfo();
    qdrantCount = info.points_count ?? 0;
  } catch {
    // Qdrant unavailable — not fatal
  }

  return NextResponse.json({
    usage: {
      totalUsers: totalUsers.count,
      newUsers7d: newUsers7d.count,
      newUsers30d: newUsers30d.count,
      totalConversations: totalConversations.count,
      activeToday: activeToday.count,
      totalMessages: totalMessages.count,
      messages7d: messages7d.count,
      topUsers,
      pendingReports: pendingReports.count,
    },
    content: {
      totalDocuments: totalDocs.count,
      totalChunks: totalChunks.count,
      qdrantVectors: qdrantCount,
      byScope: docStats,
    },
  });
}
