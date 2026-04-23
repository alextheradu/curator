"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon, ClockIcon, NewspaperIcon } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

interface NewsCardsProps {
  posts: Post[];
  backHref: string;
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

function isNew(value?: Date | string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export function NewsCards({ posts, backHref }: NewsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {posts.map((post, index) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.05 * index,
            duration: 0.38,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Link
            href={`/news/${post.slug}?from=${encodeURIComponent(backHref)}`}
            className="group flex h-full flex-col rounded-[1.5rem] border border-border/60 bg-card/64 p-5 shadow-[var(--shadow-card)] transition-colors hover:border-white/10 hover:bg-card/78"
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
        </motion.div>
      ))}
    </div>
  );
}
