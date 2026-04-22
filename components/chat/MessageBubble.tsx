"use client";

import { CopyIcon } from "lucide-react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { ReportButton } from "@/components/chat/ReportButton";
import { cn, normalizeAssistantMarkdown } from "@/lib/utils";
import type { Message } from "@/lib/store";
import type { Citation } from "@/lib/db/schema";
import { toast } from "sonner";

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
  const actionButtonClass =
    "rounded-lg p-1 text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground opacity-100 md:opacity-0 md:group-hover/message:opacity-100";

  const handleCopy = async (content: string, label: "Prompt" | "Response") => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(`${label} copied.`);
    } catch (error) {
      console.error(error);
      toast.error(`Unable to copy the ${label.toLowerCase()}.`);
    }
  };

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
        {isAssistant && (
          <div className="hidden h-[calc(13px*1.65)] shrink-0 items-center sm:flex">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}

        {/* Content */}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <AssistantMarkdown content={normalizedContent} isStreaming={isStreaming} />

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

            {!isStreaming && message.id && (
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => void handleCopy(normalizedContent, "Response")}
                  className={actionButtonClass}
                  title="Copy response"
                  aria-label="Copy response"
                >
                  <CopyIcon className="size-3" />
                </button>
                <ReportButton messageId={message.id} className={actionButtonClass} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="w-fit max-w-[min(88vw,56ch)] overflow-hidden break-words rounded-[1.35rem] rounded-br-lg border border-border/50 bg-muted px-3.5 py-2.5 text-[14px] leading-[1.65] sm:max-w-[min(80vw,56ch)] sm:rounded-2xl sm:text-[13px]">
              <p className="whitespace-pre-wrap">{normalizedContent}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy(normalizedContent, "Prompt")}
              className={actionButtonClass}
              title="Copy prompt"
              aria-label="Copy prompt"
            >
              <CopyIcon className="size-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
