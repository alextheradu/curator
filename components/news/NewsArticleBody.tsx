"use client";

import { motion } from "framer-motion";
import { CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";

interface NewsArticleBodyProps {
  title: string;
  summary: string;
  content: string;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date;
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 200));
}

export function NewsArticleBody({
  title,
  summary,
  content,
  authorName,
  publishedAt,
  createdAt,
}: NewsArticleBodyProps) {
  return (
    <motion.article
      className="rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl sm:p-10"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        <NewspaperIcon className="size-3.5" />
        Curator update
      </div>

      <motion.h1
        className="mt-4 text-[1.9rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-5 sm:text-4xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {title}
      </motion.h1>

      <motion.p
        className="mt-3 text-[14px] leading-6 text-muted-foreground sm:mt-4 sm:text-[16px] sm:leading-7"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {summary}
      </motion.p>

      <motion.div
        className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {formatDate(publishedAt ?? createdAt) && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {formatDate(publishedAt ?? createdAt)}
          </span>
        )}
        {authorName && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/[0.04] px-2.5 py-0.5 text-[11px]">
            {authorName}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <ClockIcon className="size-3.5" />
          {readingTime(content)} min read
        </span>
      </motion.div>

      <div className="mt-6 border-t border-border/50 pt-6 sm:mt-8 sm:pt-8">
        <BlogMarkdown content={content} />
      </div>
    </motion.article>
  );
}
