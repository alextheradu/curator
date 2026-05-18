import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SidebarInset } from "@/components/ui/sidebar";
import { NewsArticleBody } from "@/components/news/NewsArticleBody";
import { getCachedPublicBlogPost } from "@/lib/blog";
import { buildPublicPageMetadata, NO_INDEX_ROBOTS } from "@/lib/seo";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPublicBlogPost(slug);
  if (!post) {
    return {
      ...buildPublicPageMetadata({
        title: "News",
        description: "Product updates and release notes from Curator.",
        path: "/news",
      }),
      robots: NO_INDEX_ROBOTS,
    };
  }
  return {
    ...buildPublicPageMetadata({
      title: post.title,
      description: post.summary,
      path: `/news/${post.slug}` as `/news/${string}`,
    }),
    robots: NO_INDEX_ROBOTS,
  };
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

        <NewsArticleBody
          title={post.title}
          summary={post.summary}
          content={post.content}
          authorName={post.authorName}
          publishedAt={post.publishedAt}
          createdAt={post.createdAt}
        />

      </div>
    </SidebarInset>
  );
}
