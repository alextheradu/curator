"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon, CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";

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

interface NewsHeroProps {
  post: Post;
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

export function NewsHero({ post, backHref }: NewsHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={`/news/${post.slug}?from=${encodeURIComponent(backHref)}`}
        className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl transition-colors hover:border-white/10 hover:bg-card/85 sm:p-8"
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
          <NewspaperIcon className="size-3.5" />
          Latest update
          {isNew(post.publishedAt ?? post.createdAt) && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-400">
              New
            </span>
          )}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {post.title}
        </h2>
        <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
          {post.summary}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          {formatDate(post.publishedAt ?? post.createdAt) && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
          )}
          {post.authorName && <span>By {post.authorName}</span>}
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-3.5" />
            {readingTime(post.content)} min read
          </span>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-foreground sm:text-sm">
          Read update
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
