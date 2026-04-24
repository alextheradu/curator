import "server-only";

import { unstable_cache } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  ADMIN_BLOG_CACHE_TAG,
  PUBLIC_BLOG_INDEX_CACHE_TAG,
  getPublicBlogPostCacheTag,
} from "@/lib/cache-tags";
import { withAdminDbAccess, withDbAccessContext } from "@/lib/db/access";
import { blogPosts, users } from "@/lib/db/schema";

const BLOG_ADMIN_CACHE_USER_ID = "admin-blog-cache";
const authorDisplayName = sql<string | null>`coalesce(nullif(trim(${users.preferredName}), ''), nullif(trim(${users.name}), ''))`;

type CachedDateValue = Date | string;

export type AdminBlogPostRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CachedAdminBlogPostRow = Omit<AdminBlogPostRow, "publishedAt" | "createdAt" | "updatedAt"> & {
  publishedAt: CachedDateValue | null;
  createdAt: CachedDateValue;
  updatedAt: CachedDateValue;
};

export type PublicBlogPostRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type CachedPublicBlogPostRow = Omit<PublicBlogPostRow, "publishedAt" | "createdAt" | "updatedAt"> & {
  publishedAt: CachedDateValue | null;
  createdAt: CachedDateValue;
  updatedAt: CachedDateValue;
};

function coerceDate(value: CachedDateValue, fieldName: string) {
  if (value instanceof Date) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid cached blog date for ${fieldName}: ${value}`);
  }

  return date;
}

function normalizeAdminBlogPostRow(row: CachedAdminBlogPostRow): AdminBlogPostRow {
  return {
    ...row,
    publishedAt: row.publishedAt ? coerceDate(row.publishedAt, "publishedAt") : null,
    createdAt: coerceDate(row.createdAt, "createdAt"),
    updatedAt: coerceDate(row.updatedAt, "updatedAt"),
  };
}

function normalizePublicBlogPostRow(row: CachedPublicBlogPostRow): PublicBlogPostRow {
  return {
    ...row,
    publishedAt: row.publishedAt ? coerceDate(row.publishedAt, "publishedAt") : null,
    createdAt: coerceDate(row.createdAt, "createdAt"),
    updatedAt: coerceDate(row.updatedAt, "updatedAt"),
  };
}

export async function getCachedAdminBlogPosts() {
  const load = unstable_cache(
    async () => withAdminDbAccess(BLOG_ADMIN_CACHE_USER_ID, (tx) => tx
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        summary: blogPosts.summary,
        content: blogPosts.content,
        authorId: blogPosts.authorId,
        authorName: authorDisplayName,
        published: blogPosts.published,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .orderBy(desc(blogPosts.updatedAt), desc(blogPosts.createdAt))),
    ["admin-blog"],
    {
      revalidate: 300,
      tags: [ADMIN_BLOG_CACHE_TAG],
    },
  );

  const rows = await load() as CachedAdminBlogPostRow[];
  return rows.map(normalizeAdminBlogPostRow);
}

export async function getCachedPublicBlogPosts() {
  const load = unstable_cache(
    async () => withDbAccessContext({}, (tx) => tx
      .select({
        id: blogPosts.id,
        slug: blogPosts.slug,
        title: blogPosts.title,
        summary: blogPosts.summary,
        content: blogPosts.content,
        authorName: authorDisplayName,
        publishedAt: blogPosts.publishedAt,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
      })
      .from(blogPosts)
      .leftJoin(users, eq(blogPosts.authorId, users.id))
      .where(eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))),
    ["public-blog-index"],
    {
      revalidate: 300,
      tags: [PUBLIC_BLOG_INDEX_CACHE_TAG],
    },
  );

  const rows = await load() as CachedPublicBlogPostRow[];
  return rows.map(normalizePublicBlogPostRow);
}

export async function getCachedPublicBlogPost(slug: string) {
  const load = unstable_cache(
    async () => withDbAccessContext({}, async (tx) => {
      const [post] = await tx
        .select({
          id: blogPosts.id,
          slug: blogPosts.slug,
          title: blogPosts.title,
          summary: blogPosts.summary,
          content: blogPosts.content,
          authorName: authorDisplayName,
          publishedAt: blogPosts.publishedAt,
          createdAt: blogPosts.createdAt,
          updatedAt: blogPosts.updatedAt,
        })
        .from(blogPosts)
        .leftJoin(users, eq(blogPosts.authorId, users.id))
        .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
        .limit(1);

      return post ?? null;
    }),
    ["public-blog-post", slug],
    {
      revalidate: 300,
      tags: [getPublicBlogPostCacheTag(slug)],
    },
  );

  const post = await load() as CachedPublicBlogPostRow | null;
  return post ? normalizePublicBlogPostRow(post) : null;
}
