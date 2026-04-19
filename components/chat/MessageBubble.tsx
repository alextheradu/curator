"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { ReportButton } from "@/components/chat/ReportButton";
import { cn, normalizeAssistantMarkdown } from "@/lib/utils";
import type { Message } from "@/lib/store";
import type { Citation } from "@/lib/db/schema";

const SparklesIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  </svg>
);

interface Props {
  message: Message;
  isStreaming?: boolean;
  onOpenCitation?: (citation: Citation) => void;
}

export function MessageBubble({ message, isStreaming, onOpenCitation }: Props) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const normalizedContent = isAssistant ? normalizeAssistantMarkdown(message.content) : message.content;

  return (
    <div
      className={cn(
        "group/message w-full",
        !isAssistant && "animate-[fade-up_0.25s_cubic-bezier(0.22,1,0.36,1)]"
      )}
      data-role={message.role}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3"
        )}
      >
        {/* Assistant icon */}
        {isAssistant && (
          <div className="flex h-[calc(13px*1.65)] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}

        {/* Content */}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="text-[13px] leading-[1.65] text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const langMatch = className?.match(/language-(\w+)/);
                    const isBlock = !!langMatch;
                    return isBlock ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={langMatch[1]}
                        PreTag="div"
                        className="!my-3 !rounded-xl !border !border-border/30 !text-xs"
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
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
                  h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h1>,
                  h2: ({ children }) => <h2 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h2>,
                  h3: ({ children }) => <h3 className="mb-1 mt-3 font-semibold first:mt-0">{children}</h3>,
                  blockquote: ({ children }) => (
                    <blockquote className="my-3 border-l-2 border-border pl-3 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto">
                      <table className="w-full border-collapse text-xs">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border bg-muted/40 px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
                  a: ({ children, href }) => (
                    <a href={href} className="text-foreground underline underline-offset-2 hover:opacity-70" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {normalizedContent}
              </ReactMarkdown>
              {isStreaming && (
                <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-foreground/60" />
              )}
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {message.citations.map((citation, index) => (
                  <CitationBadge
                    key={index}
                    citation={citation}
                    index={index + 1}
                    onOpen={citation.type === "doc" ? onOpenCitation : undefined}
                  />
                ))}
              </div>
            )}

            {/* Report button — only for persisted (non-streaming) messages */}
            {!isStreaming && message.id && (
              <ReportButton messageId={message.id} />
            )}
          </div>
        ) : (
          /* User bubble */
          <div className="w-fit max-w-[min(80%,56ch)] overflow-hidden break-words rounded-2xl rounded-br-lg border border-border/50 bg-muted px-3.5 py-2.5 text-[13px] leading-[1.65]">
            <p className="whitespace-pre-wrap">{normalizedContent}</p>
          </div>
        )}
      </div>
    </div>
  );
}
