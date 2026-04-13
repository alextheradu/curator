"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { parseCitations } from "@/lib/utils";
import { Message } from "@/lib/store";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-border/60 hover:bg-surface-border
        text-text-muted hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
}

export function MessageBubble({ message, isStreaming, streamContent }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isUser = message.role === "user";
  const content = isStreaming ? (streamContent ?? "") : message.content;
  const citations = !isStreaming ? parseCitations(content) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border ${
        isUser
          ? "bg-frc-blue/20 border-frc-blue/40"
          : "bg-surface-elevated border-surface-border"
      }`}>
        {isUser
          ? <User size={14} className="text-frc-blue" />
          : <Bot size={14} className="text-frc-blue" />
        }
      </div>

      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-frc-blue to-[#0D47A1] text-white"
            : "rounded-tl-sm bg-surface-elevated border border-surface-border text-text-primary"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeText = String(children).replace(/\n$/, "");
                  if (!inline && match) {
                    return (
                      <div className="relative group my-2 rounded-lg overflow-hidden border border-surface-border">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-border/60 border-b border-surface-border">
                          <span className="text-xs font-mono text-text-muted">{match[1]}</span>
                          <CopyButton text={codeText} />
                        </div>
                        <SyntaxHighlighter
                          style={isDark ? vscDarkPlus : vs}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0, background: "transparent",
                            fontSize: "0.8rem", fontFamily: "JetBrains Mono, monospace",
                          }}
                          {...props}
                        >
                          {codeText}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-surface-border font-mono text-xs text-frc-yellow" {...props}>
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-xs border-collapse border border-surface-border rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return <th className="px-3 py-2 bg-surface-border/60 text-left font-semibold text-text-muted border-b border-surface-border">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-3 py-2 border-b border-surface-border/40">{children}</td>;
                },
                a({ href, children }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-frc-blue hover:underline">{children}</a>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}

          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-0.5 h-4 bg-frc-blue ml-0.5 align-middle"
            />
          )}
        </div>

        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {citations.map((c, i) => <CitationBadge key={i} citation={c} />)}
          </div>
        )}

        <span className="text-xs text-text-muted opacity-50 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}
