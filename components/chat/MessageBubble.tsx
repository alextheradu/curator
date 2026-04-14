"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/store";

interface Props { message: Message; isStreaming?: boolean; }

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("mb-6 flex gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        isUser ? "bg-[#0066B3] text-white" : "bg-[#ED1C24] text-white"
      )}>
        {isUser ? "U" : "C"}
      </div>

      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-[#1a1a1a] text-white border border-[#2e2e2e]" : "text-[#F5F5F5]"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
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
                      className="!rounded-xl !text-xs"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="rounded bg-[#242424] px-1.5 py-0.5 font-mono text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#ED1C24] pl-3 text-[#8A8A8A] italic">{children}</blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-left font-medium">{children}</th>
                ),
                td: ({ children }) => <td className="border border-[#2e2e2e] px-3 py-2">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#ED1C24]" />
          )}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationBadge key={i} citation={c} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
