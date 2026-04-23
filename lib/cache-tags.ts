import { revalidateTag } from "next/cache";

export const ADMIN_STATS_CACHE_TAG = "admin-stats";
export const ADMIN_CHATS_CACHE_TAG = "admin-chats";
export const ADMIN_REPORTS_CACHE_TAG = "admin-reports";
export const ADMIN_DOCUMENTS_CACHE_TAG = "admin-documents";
export const ADMIN_USERS_CACHE_TAG = "admin-users";
export const ADMIN_BLOG_CACHE_TAG = "admin-blog";
export const PUBLIC_BLOG_INDEX_CACHE_TAG = "public-blog-index";

export function revalidateAdminStatsCache() {
  revalidateTag(ADMIN_STATS_CACHE_TAG, "max");
}

export function revalidateAdminChatsCache() {
  revalidateTag(ADMIN_CHATS_CACHE_TAG, "max");
}

export function revalidateAdminReportsCache() {
  revalidateTag(ADMIN_REPORTS_CACHE_TAG, "max");
}

export function revalidateAdminDocumentsCache() {
  revalidateTag(ADMIN_DOCUMENTS_CACHE_TAG, "max");
}

export function revalidateAdminUsersCache() {
  revalidateTag(ADMIN_USERS_CACHE_TAG, "max");
}

export function revalidateAdminBlogCache() {
  revalidateTag(ADMIN_BLOG_CACHE_TAG, "max");
}

export function revalidatePublicBlogIndexCache() {
  revalidateTag(PUBLIC_BLOG_INDEX_CACHE_TAG, "max");
}

export function getPublicBlogPostCacheTag(slug: string) {
  return `public-blog-post:${slug}`;
}

export function revalidatePublicBlogPostCache(slug: string) {
  revalidateTag(getPublicBlogPostCacheTag(slug), "max");
}

export function revalidateConversationDerivedCaches() {
  revalidateAdminChatsCache();
  revalidateAdminUsersCache();
  revalidateAdminStatsCache();
}

export function revalidateReportDerivedCaches() {
  revalidateAdminReportsCache();
  revalidateAdminChatsCache();
  revalidateAdminUsersCache();
  revalidateAdminStatsCache();
}

export function revalidateDocumentDerivedCaches() {
  revalidateAdminDocumentsCache();
  revalidateAdminStatsCache();
}

export function revalidateUserDerivedCaches() {
  revalidateAdminUsersCache();
  revalidateAdminStatsCache();
}

export function revalidateBlogDerivedCaches(currentSlug?: string | null, previousSlug?: string | null) {
  revalidateAdminBlogCache();
  revalidatePublicBlogIndexCache();
  revalidateAdminStatsCache();

  if (previousSlug?.trim()) {
    revalidatePublicBlogPostCache(previousSlug.trim());
  }

  if (currentSlug?.trim() && currentSlug?.trim() !== previousSlug?.trim()) {
    revalidatePublicBlogPostCache(currentSlug.trim());
  }
}

export function normalizeCacheKeyPart(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : "_";
}
