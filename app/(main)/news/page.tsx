import type { Metadata } from "next";
import Link from "next/link";
import { NewspaperIcon } from "lucide-react";
import { SidebarInset } from "@/components/ui/sidebar";
import { NewsCards } from "@/components/news/NewsCards";
import { NewsHero } from "@/components/news/NewsHero";
import { getCachedPublicBlogPosts } from "@/lib/blog";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "News",
  description: "Product updates, release notes, and operator notes from Curator.",
  path: "/news",
  keywords: ["Curator news", "Curator updates", "FRC AI updates"],
});

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
            {latest && <NewsHero post={latest} backHref={backHref} />}

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
                <NewsCards posts={older} backHref={backHref} />
              </section>
            )}
          </>
        )}
      </div>
    </SidebarInset>
  );
}
