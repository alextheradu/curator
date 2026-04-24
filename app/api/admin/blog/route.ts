import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isAdminEmail } from "@/lib/admin-emails";
import { getCachedAdminBlogPosts } from "@/lib/blog";
import { revalidateBlogDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { blogPosts, users } from "@/lib/db/schema";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const BlogPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug is required.")
    .max(200, "Slug is too long.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  title: z.string().trim().min(1, "Title is required.").max(300, "Title is too long."),
  summary: z.string().trim().min(1, "Summary is required.").max(600, "Summary is too long."),
  content: z.string().trim().min(1, "Content is required."),
  authorId: z.string().min(1).nullable().optional(),
  published: z.boolean(),
});

function isUniqueViolation(error: unknown) {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "23505";
}

function getValidationErrorMessage(error: z.ZodError) {
  const flattened = error.flatten();
  const firstFieldError = Object.values(flattened.fieldErrors).flat().find(Boolean);
  return firstFieldError ?? flattened.formErrors[0] ?? "Invalid blog post payload.";
}

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const posts = await getCachedAdminBlogPosts();
  return NextResponse.json(posts);
}

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const rateLimit = await enforceRequestRateLimit(req, "adminBlogMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many blog changes. Please slow down." }, { status: 429, headers });
  }

  const body = await req.json() as unknown;
  const parsed = BlogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: getValidationErrorMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400, headers },
    );
  }

  const { slug, title, summary, content, published } = parsed.data;
  const authorId = parsed.data.authorId === undefined ? adminAuth.userId : parsed.data.authorId;

  if (authorId) {
    const [author] = await withAdminDbAccess(adminAuth.userId, (tx) => tx
      .select({ id: users.id, email: users.email, isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1));

    if (!author || (!author.isAdmin && !isAdminEmail(author.email))) {
      return NextResponse.json({ error: "Selected author must be an admin user." }, { status: 400, headers });
    }
  }

  try {
    const [created] = await withAdminDbAccess(adminAuth.userId, (tx) => tx
      .insert(blogPosts)
      .values({
        slug,
        title,
        summary,
        content,
        authorId,
        published,
        publishedAt: published ? new Date() : null,
      })
      .returning());

    revalidateBlogDerivedCaches(created.slug);
    return NextResponse.json(created, { status: 201, headers });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "A post with that slug already exists." }, { status: 409, headers });
    }

    throw error;
  }
}
