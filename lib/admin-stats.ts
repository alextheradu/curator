import { unstable_cache } from "next/cache";
import { and, count, eq, gt, gte, sql, sum } from "drizzle-orm";
import { withDbAccessContext } from "@/lib/db/access";
import {
  accounts,
  bannedIps,
  conversations,
  docChunks,
  documents,
  messages,
  reports,
  sessions,
  users,
} from "@/lib/db/schema";
import { getCollectionInfo } from "@/lib/qdrant";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

const loadAdminStats = unstable_cache(
  async () => withDbAccessContext({ userId: "admin-stats", isAdmin: true }, async (tx) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      [totalUsers],
      [newUsers1d],
      [newUsers7d],
      [newUsers30d],
      [adminUsers],
      [verifiedUsers],
      [bannedUsers],
      [totalConversations],
      [publicConversations],
      [privateConversations],
      [newConversations7d],
      [activeToday],
      [activeUsers7d],
      [totalMessages],
      [messages1d],
      [messages7d],
      [messages30d],
      [userMessages],
      [assistantMessages],
      [avgMessagesPerConversation],
      [avgMessageLength],
      topUsers,
      [pendingReports],
      [reviewedReports],
      [dismissedReports],
      [reports7d],
      [totalDocs],
      [docs7d],
      [docsWithDescriptions],
      [totalDocPages],
      docsByScope,
      [totalChunks],
      [totalAccounts],
      accountProviders,
      [totalSessions],
      [activeSessions],
      [blockedIps],
    ] = await Promise.all([
      tx.select({ count: count() }).from(users),
      tx.select({ count: count() }).from(users).where(gte(users.createdAt, oneDayAgo)),
      tx.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
      tx.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
      tx.select({ count: count() }).from(users).where(eq(users.isAdmin, true)),
      tx.select({ count: count() }).from(users).where(sql`${users.emailVerified} is not null`),
      tx.select({ count: count() }).from(users).where(eq(users.ipBanned, true)),
      tx.select({ count: count() }).from(conversations),
      tx.select({ count: count() }).from(conversations).where(eq(conversations.isPublic, true)),
      tx.select({ count: count() }).from(conversations).where(eq(conversations.isPublic, false)),
      tx.select({ count: count() }).from(conversations).where(gte(conversations.createdAt, sevenDaysAgo)),
      tx.select({ count: count() }).from(conversations).where(gte(conversations.updatedAt, todayStart)),
      tx
        .select({ count: sql<number>`count(distinct ${conversations.userId})` })
        .from(conversations)
        .where(gte(conversations.updatedAt, sevenDaysAgo)),
      tx.select({ count: count() }).from(messages),
      tx.select({ count: count() }).from(messages).where(gte(messages.createdAt, oneDayAgo)),
      tx.select({ count: count() }).from(messages).where(gte(messages.createdAt, sevenDaysAgo)),
      tx.select({ count: count() }).from(messages).where(gte(messages.createdAt, thirtyDaysAgo)),
      tx.select({ count: count() }).from(messages).where(eq(messages.role, "user")),
      tx.select({ count: count() }).from(messages).where(eq(messages.role, "assistant")),
      tx
        .select({
          value: sql<number>`coalesce(round(count(*)::numeric / nullif(count(distinct ${messages.conversationId}), 0), 2), 0)`,
        })
        .from(messages),
      tx
        .select({
          value: sql<number>`coalesce(round(avg(char_length(${messages.content}))::numeric, 1), 0)`,
        })
        .from(messages),
      tx
        .select({ name: users.name, email: users.email, msgCount: count() })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .innerJoin(users, eq(conversations.userId, users.id))
        .groupBy(users.id, users.name, users.email)
        .orderBy(sql`count(*) desc`)
        .limit(5),
      tx.select({ count: count() }).from(reports).where(eq(reports.status, "pending")),
      tx.select({ count: count() }).from(reports).where(eq(reports.status, "reviewed")),
      tx.select({ count: count() }).from(reports).where(eq(reports.status, "dismissed")),
      tx.select({ count: count() }).from(reports).where(gte(reports.createdAt, sevenDaysAgo)),
      tx.select({ count: count() }).from(documents),
      tx.select({ count: count() }).from(documents).where(gte(documents.uploadedAt, sevenDaysAgo)),
      tx
        .select({ count: count() })
        .from(documents)
        .where(and(sql`${documents.description} is not null`, sql`char_length(trim(${documents.description})) > 0`)),
      tx.select({ total: sum(documents.pageCount) }).from(documents),
      tx
        .select({ scope: documents.scope, docCount: count(), totalPages: sum(documents.pageCount) })
        .from(documents)
        .groupBy(documents.scope),
      tx.select({ count: count() }).from(docChunks),
      tx.select({ count: count() }).from(accounts),
      tx
        .select({ provider: accounts.provider, count: count() })
        .from(accounts)
        .groupBy(accounts.provider)
        .orderBy(sql`count(*) desc`),
      tx.select({ count: count() }).from(sessions),
      tx.select({ count: count() }).from(sessions).where(gt(sessions.expires, now)),
      tx.select({ count: count() }).from(bannedIps),
    ]);

    let qdrantCount = 0;
    try {
      const info = await getCollectionInfo();
      qdrantCount = info.points_count ?? 0;
    } catch {
      // Qdrant availability should not break the admin stats surface.
    }

    return {
      generatedAt: now.toISOString(),
      totalUsers,
      newUsers1d,
      newUsers7d,
      newUsers30d,
      adminUsers,
      verifiedUsers,
      bannedUsers,
      totalConversations,
      publicConversations,
      privateConversations,
      newConversations7d,
      activeToday,
      activeUsers7d,
      totalMessages,
      messages1d,
      messages7d,
      messages30d,
      userMessages,
      assistantMessages,
      avgMessagesPerConversation: toNumber(avgMessagesPerConversation.value),
      avgMessageLength: toNumber(avgMessageLength.value),
      topUsers,
      pendingReports,
      reviewedReports,
      dismissedReports,
      reports7d,
      totalDocs,
      docs7d,
      docsWithDescriptions,
      totalDocPages: toNumber(totalDocPages.total),
      docsByScope,
      totalChunks,
      totalAccounts,
      accountProviders,
      totalSessions,
      activeSessions,
      blockedIps,
      qdrantCount,
    };
  }),
  ["admin-stats"],
  {
    revalidate: 300,
    tags: ["admin-stats"],
  },
);

export async function getAdminStats() {
  return loadAdminStats();
}
