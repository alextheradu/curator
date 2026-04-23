"use client";

import { lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn, normalizeAssistantMarkdown } from "@/lib/utils";

const LazyCodeBlock = lazy(() =>
  import("./LazyCodeBlock").then((m) => ({ default: m.LazyCodeBlock }))
);

interface Props {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export function AssistantMarkdown({
  content,
  className,
  isStreaming = false,
}: Props) {
  return (
    <div className={cn("text-[13px] leading-[1.65] text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const langMatch = className?.match(/language-(\w+)/);
            const isBlock = !!langMatch;

            return isBlock ? (
              <Suspense
                fallback={
                  <pre className="my-3 rounded-xl border border-border/30 bg-muted/30 p-3 text-xs overflow-x-auto">
                    <code>{String(children).replace(/\n$/, "")}</code>
                  </pre>
                }
              >
                <LazyCodeBlock language={langMatch[1]}>
                  {String(children).replace(/\n$/, "")}
                </LazyCodeBlock>
              </Suspense>
            ) : (
              <code
                className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[12px]"
                {...props}
              >
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-border pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-muted/40 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2">{children}</td>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-foreground underline underline-offset-2 hover:opacity-70"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {normalizeAssistantMarkdown(content)}
      </ReactMarkdown>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-foreground/60" />
      )}
    </div>
  );
}
