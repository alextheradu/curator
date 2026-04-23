import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { SidebarInset } from "@/components/ui/sidebar";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { getCachedPublicBlogPost } from "@/lib/blog";
import { buildPublicPageMetadata } from "@/lib/seo";

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPublicBlogPost(slug);
  if (!post) {
    return buildPublicPageMetadata({
      title: "News",
      description: "Product updates and release notes from Curator.",
      path: "/news",
    });
  }
  return buildPublicPageMetadata({
    title: post.title,
    description: post.summary,
    path: `/news/${post.slug}` as `/news/${string}`,
  });
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const post = await getCachedPublicBlogPost(slug);

  if (!post) notFound();

  const backHref = from ? decodeURIComponent(from) : "/";
  const backLabel = backHref.startsWith("/c/") ? "Back to chat" : "New chat";

  return (
    <SidebarInset className="overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">

        {/* Top nav */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/news?from=${encodeURIComponent(backHref)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            ← All news
          </Link>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            {backLabel} →
          </Link>
        </div>

        {/* Article */}
        <article className="rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            <NewspaperIcon className="size-3.5" />
            Curator update
          </div>

          <h1 className="mt-4 text-[1.9rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-5 sm:text-4xl">
            {post.title}
          </h1>

          <p className="mt-3 text-[14px] leading-6 text-muted-foreground sm:mt-4 sm:text-[16px] sm:leading-7">
            {post.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            {formatDate(post.publishedAt ?? post.createdAt) && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
            )}
            {post.authorName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/[0.04] px-2.5 py-0.5 text-[11px]">
                {post.authorName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              {readingTime(post.content)} min read
            </span>
          </div>

          <div className="mt-6 border-t border-border/50 pt-6 sm:mt-8 sm:pt-8">
            <BlogMarkdown content={post.content} />
          </div>
        </article>

      </div>
    </SidebarInset>
  );
}
