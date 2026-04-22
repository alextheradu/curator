import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/admin-stats";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const stats = await getAdminStats();

  return NextResponse.json({
    generatedAt: stats.generatedAt,
    usage: {
      totalUsers: stats.totalUsers.count,
      newUsers1d: stats.newUsers1d.count,
      newUsers7d: stats.newUsers7d.count,
      newUsers30d: stats.newUsers30d.count,
      adminUsers: stats.adminUsers.count,
      verifiedUsers: stats.verifiedUsers.count,
      bannedUsers: stats.bannedUsers.count,
      totalConversations: stats.totalConversations.count,
      publicConversations: stats.publicConversations.count,
      privateConversations: stats.privateConversations.count,
      newConversations7d: stats.newConversations7d.count,
      activeToday: stats.activeToday.count,
      activeUsers7d: stats.activeUsers7d,
      totalMessages: stats.totalMessages.count,
      messages1d: stats.messages1d.count,
      messages7d: stats.messages7d.count,
      messages30d: stats.messages30d.count,
      userMessages: stats.userMessages.count,
      assistantMessages: stats.assistantMessages.count,
      avgMessagesPerConversation: stats.avgMessagesPerConversation,
      avgMessageLength: stats.avgMessageLength,
      topUsers: stats.topUsers,
      reports: {
        pending: stats.pendingReports.count,
        reviewed: stats.reviewedReports.count,
        dismissed: stats.dismissedReports.count,
        last7d: stats.reports7d.count,
      },
    },
    content: {
      totalDocuments: stats.totalDocs.count,
      documents7d: stats.docs7d.count,
      docsWithDescriptions: stats.docsWithDescriptions.count,
      totalDocPages: stats.totalDocPages,
      totalChunks: stats.totalChunks.count,
      qdrantVectors: stats.qdrantCount,
      qdrantDelta: stats.qdrantCount - stats.totalChunks.count,
      byScope: stats.docsByScope,
    },
    auth: {
      totalAccounts: stats.totalAccounts.count,
      providers: stats.accountProviders,
      totalSessions: stats.totalSessions.count,
      activeSessions: stats.activeSessions.count,
      blockedIps: stats.blockedIps.count,
    },
  });
}
