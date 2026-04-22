import { unstable_cache } from "next/cache";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { withAdminDbAccess, withDbAccessContext } from "@/lib/db/access";
import { conversations, documents, messages, reports, users } from "@/lib/db/schema";
import {
  ADMIN_CHATS_CACHE_TAG,
  ADMIN_DOCUMENTS_CACHE_TAG,
  ADMIN_REPORTS_CACHE_TAG,
  ADMIN_USERS_CACHE_TAG,
  normalizeCacheKeyPart,
} from "@/lib/cache-tags";

const ADMIN_CACHE_USER_ID = "admin-cache";

export async function getCachedAdminDocuments() {
  const load = unstable_cache(
    async () => withAdminDbAccess(ADMIN_CACHE_USER_ID, (tx) => tx
      .select()
      .from(documents)
      .orderBy(desc(documents.uploadedAt))),
    ["admin-documents"],
    {
      revalidate: 300,
      tags: [ADMIN_DOCUMENTS_CACHE_TAG],
    },
  );

  return load();
}

export async function getCachedAdminReports() {
  const load = unstable_cache(
    async () => withAdminDbAccess(ADMIN_CACHE_USER_ID, (tx) => tx
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
      .limit(200)),
    ["admin-reports"],
    {
      revalidate: 60,
      tags: [ADMIN_REPORTS_CACHE_TAG],
    },
  );

  return load();
}

export async function getCachedAdminChats(userId?: string | null, search?: string | null) {
  const normalizedUserId = normalizeCacheKeyPart(userId);
  const normalizedSearch = normalizeCacheKeyPart(search);
  const searchValue = search?.trim() ?? "";

  const load = unstable_cache(
    async () => {
      const rows = await withAdminDbAccess(ADMIN_CACHE_USER_ID, (tx) => tx
        .select({
          id: conversations.id,
          title: conversations.title,
          seasonYear: conversations.seasonYear,
          createdAt: conversations.createdAt,
          updatedAt: conversations.updatedAt,
          userId: conversations.userId,
          userName: users.name,
          userEmail: users.email,
          msgCount: count(messages.id),
        })
        .from(conversations)
        .innerJoin(users, eq(conversations.userId, users.id))
        .leftJoin(messages, eq(messages.conversationId, conversations.id))
        .where(
          and(
            userId ? eq(conversations.userId, userId) : undefined,
            searchValue ? ilike(conversations.title, `%${searchValue}%`) : undefined,
          ),
        )
        .groupBy(conversations.id, users.name, users.email, users.id)
        .orderBy(desc(conversations.updatedAt))
        .limit(200));

      const pendingConvIds = new Set(
        (await withAdminDbAccess(ADMIN_CACHE_USER_ID, (tx) => tx
          .select({ conversationId: reports.conversationId })
          .from(reports)
          .where(eq(reports.status, "pending"))))
          .map((row) => row.conversationId),
      );

      return rows.map((row) => ({
        ...row,
        hasPendingReport: pendingConvIds.has(row.id),
      }));
    },
    ["admin-chats", normalizedUserId, normalizedSearch],
    {
      revalidate: 60,
      tags: [ADMIN_CHATS_CACHE_TAG],
    },
  );

  return load();
}

export async function getCachedAdminUsers(search?: string | null, filter?: string | null) {
  const normalizedSearch = normalizeCacheKeyPart(search);
  const normalizedFilter = normalizeCacheKeyPart(filter);
  const searchValue = search?.trim() ?? "";
  const filterValue = filter?.trim() || "all";

  const load = unstable_cache(
    async () => {
      const rows = await withDbAccessContext({ userId: ADMIN_CACHE_USER_ID, isAdmin: true }, (tx) => tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          isAdmin: users.isAdmin,
          ipBanned: users.ipBanned,
          bannedIp: users.bannedIp,
          createdAt: users.createdAt,
          msgCount: count(messages.id),
        })
        .from(users)
        .leftJoin(conversations, eq(conversations.userId, users.id))
        .leftJoin(messages, eq(messages.conversationId, conversations.id))
        .where(
          searchValue
            ? or(ilike(users.name, `%${searchValue}%`), ilike(users.email, `%${searchValue}%`))
            : undefined,
        )
        .groupBy(users.id)
        .orderBy(desc(users.createdAt)));

      return rows.filter((user) => {
        if (filterValue === "admin") return user.isAdmin;
        if (filterValue === "banned") return user.ipBanned;
        return true;
      });
    },
    ["admin-users", normalizedSearch, normalizedFilter],
    {
      revalidate: 60,
      tags: [ADMIN_USERS_CACHE_TAG],
    },
  );

  return load();
}
