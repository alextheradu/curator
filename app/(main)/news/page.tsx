import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";
import { SidebarInset } from "@/components/ui/sidebar";
import { getCachedPublicBlogPosts } from "@/lib/blog";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "News",
  description: "Product updates, release notes, and operator notes from Curator.",
  path: "/news",
  keywords: ["Curator news", "Curator updates", "FRC AI updates"],
});

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function isNew(value?: Date | string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const posts = await getCachedPublicBlogPosts();
  const [latest, ...older] = posts;
  const backHref = from ? decodeURIComponent(from) : "/";
  const backLabel = backHref.startsWith("/c/") ? "Back to chat" : "New chat";

  return (
    <SidebarInset className="overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">

        {/* Top nav */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            ← {backLabel}
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground sm:text-[12px]">
            <NewspaperIcon className="size-3.5" />
            Curator News
          </div>
        </div>

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Updates & release notes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What&apos;s new in Curator
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground sm:text-[15px]">
            Product changes, operator notes, and FRC-season improvements.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[1.6rem] border border-border/60 bg-card/64 px-6 py-14 text-center text-[14px] text-muted-foreground shadow-[var(--shadow-card)]">
            No updates published yet. Check back soon.
          </div>
        ) : (
          <>
            {/* Hero — latest post */}
            {latest && (
              <Link
                href={`/news/${latest.slug}?from=${encodeURIComponent(backHref)}`}
                className="group relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl transition-colors hover:border-white/10 hover:bg-card/85 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  <NewspaperIcon className="size-3.5" />
                  Latest update
                  {isNew(latest.publishedAt ?? latest.createdAt) && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-400">
                      New
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {latest.title}
                </h2>
                <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
                  {latest.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                  {formatDate(latest.publishedAt ?? latest.createdAt) && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatDate(latest.publishedAt ?? latest.createdAt)}
                    </span>
                  )}
                  {latest.authorName && <span>By {latest.authorName}</span>}
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-3.5" />
                    {readingTime(latest.content)} min read
                  </span>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-foreground sm:text-sm">
                  Read update
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}

            {/* Older posts grid */}
            {older.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Previous updates
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {posts.length} total
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {older.map((post) => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}?from=${encodeURIComponent(backHref)}`}
                      className="group flex flex-col rounded-[1.5rem] border border-border/60 bg-card/64 p-5 shadow-[var(--shadow-card)] transition-colors hover:border-white/10 hover:bg-card/78"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <NewspaperIcon className="size-3" />
                        Update
                        {isNew(post.publishedAt ?? post.createdAt) && (
                          <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-400">
                            New
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-[17px] font-semibold leading-tight tracking-tight text-foreground">
                        {post.title}
                      </h3>
                      <p className="mt-2 flex-1 text-[13px] leading-5 text-muted-foreground">
                        {post.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                        {formatDate(post.publishedAt ?? post.createdAt) && (
                          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {readingTime(post.content)} min
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                        Read
                        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SidebarInset>
  );
}
