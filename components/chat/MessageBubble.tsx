"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, FileWarningIcon, Loader2Icon, SearchXIcon, ShieldAlertIcon, ShieldCheckIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { SearchActivityPanel } from "@/components/chat/SearchActivityPanel";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { ReportButton } from "@/components/chat/ReportButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, normalizeAssistantMarkdown } from "@/lib/utils";
import type { Message } from "@/lib/store";
import type { Citation } from "@/lib/db/schema";
import { toast } from "sonner";

type ReactionKind = "helpful" | "not_helpful";
type FlagKind = "bad_citation" | "missed_source";
type FeedbackKind = ReactionKind | FlagKind;

interface StoredMessageFeedback {
  reaction: ReactionKind | null;
  flags: Partial<Record<FlagKind, boolean>>;
}

const EMPTY_FEEDBACK: StoredMessageFeedback = { reaction: null, flags: {} };

function feedbackStorageKey(messageId: string) {
  return `curator:feedback:${messageId}`;
}

// /api/feedback is a write-only analytics log with no per-user, per-message
// record to read back - there's nothing server-side to hydrate "did I already
// like this" from. This local record is what lets the selected state survive
// a rerender or reopening the conversation on this device; it is not synced
// across devices. See the Issue 2 write-up for the product decision this implies.
function readStoredFeedback(messageId: string): StoredMessageFeedback {
  if (typeof window === "undefined") return EMPTY_FEEDBACK;
  try {
    const raw = localStorage.getItem(feedbackStorageKey(messageId));
    if (!raw) return EMPTY_FEEDBACK;
    const parsed = JSON.parse(raw) as Partial<StoredMessageFeedback>;
    return { reaction: parsed.reaction ?? null, flags: parsed.flags ?? {} };
  } catch {
    return EMPTY_FEEDBACK;
  }
}

function writeStoredFeedback(messageId: string, value: StoredMessageFeedback) {
  try {
    localStorage.setItem(feedbackStorageKey(messageId), JSON.stringify(value));
  } catch {
    // Best-effort only - this is local reaction state, not the source of truth.
  }
}

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
  // relative + before:-inset-1 pads the tap target to ~44px without changing
  // the button's visible size/padding - only the invisible hit area grows.
  const actionButtonClass =
    "relative rounded-lg p-2.5 sm:p-1 text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground opacity-100 md:opacity-0 md:group-hover/message:opacity-100 before:absolute before:-inset-1 before:content-['']";

  const [reaction, setReaction] = useState<ReactionKind | null>(null);
  const [flags, setFlags] = useState<Partial<Record<FlagKind, boolean>>>({});
  const [pendingActions, setPendingActions] = useState<Set<FeedbackKind>>(new Set());
  const [copiedKey, setCopiedKey] = useState<"prompt" | "response" | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message.id) return;
    const stored = readStoredFeedback(message.id);
    setReaction(stored.reaction);
    setFlags(stored.flags);
  }, [message.id]);

  useEffect(() => () => {
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
  }, []);

  const handleCopy = async (content: string, label: "Prompt" | "Response") => {
    const key = label === "Prompt" ? "prompt" : "response";
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopiedKey(null), 1500);
      toast.success(`${label} copied.`);
    } catch (error) {
      console.error(error);
      toast.error(`Unable to copy the ${label.toLowerCase()}.`);
    }
  };

  const submitFeedback = async (kind: FeedbackKind) => {
    if (!message.id || pendingActions.has(kind)) return;

    const isReaction = kind === "helpful" || kind === "not_helpful";
    const previousReaction = reaction;
    const previousFlags = flags;
    let nextReaction = reaction;
    let nextFlags = flags;
    let turningOn: boolean;

    if (isReaction) {
      nextReaction = reaction === kind ? null : (kind as ReactionKind);
      turningOn = nextReaction !== null;
      setReaction(nextReaction);
    } else {
      const flagKind = kind as FlagKind;
      turningOn = !flags[flagKind];
      nextFlags = { ...flags, [flagKind]: turningOn };
      setFlags(nextFlags);
    }

    writeStoredFeedback(message.id, { reaction: nextReaction, flags: nextFlags });

    // Turning a selection off is a local-only correction - /api/feedback only
    // appends an event log, there is nothing server-side to retract.
    if (!turningOn) return;

    setPendingActions((prev) => new Set(prev).add(kind));
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, kind }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save feedback.");
      }
    } catch (error) {
      // Roll back the optimistic selection so the UI matches reality.
      setReaction(previousReaction);
      setFlags(previousFlags);
      writeStoredFeedback(message.id, { reaction: previousReaction, flags: previousFlags });
      toast.error(error instanceof Error ? error.message : "Unable to save feedback.");
    } finally {
      setPendingActions((prev) => {
        const next = new Set(prev);
        next.delete(kind);
        return next;
      });
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
            {message.citations && message.citations.length > 0 && (
              <div className="flex flex-wrap content-start items-center gap-1">
                <span className="mr-1 text-[11px] font-medium text-muted-foreground">Sources used</span>
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
            <SearchActivityPanel activity={message.searchActivity} />
            <AssistantMarkdown content={normalizedContent} isStreaming={isStreaming} />

            {!isStreaming && message.id && (
              <div className="flex items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => void handleCopy(normalizedContent, "Response")}
                  className={actionButtonClass}
                  title={copiedKey === "response" ? "Copied" : "Copy response"}
                  aria-label={copiedKey === "response" ? "Response copied" : "Copy response"}
                >
                  {copiedKey === "response" ? (
                    <CheckIcon className="size-4 text-emerald-500 sm:size-3" />
                  ) : (
                    <CopyIcon className="size-4 sm:size-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedback("helpful")}
                  disabled={pendingActions.has("helpful")}
                  className={cn(actionButtonClass, reaction === "helpful" && "text-emerald-500 opacity-100 md:opacity-100")}
                  title="Helpful"
                  aria-label={reaction === "helpful" ? "Marked helpful. Tap to remove." : "Mark response helpful"}
                  aria-pressed={reaction === "helpful"}
                >
                  {pendingActions.has("helpful") ? (
                    <Loader2Icon className="size-4 animate-spin sm:size-3" />
                  ) : (
                    <ThumbsUpIcon className={cn("size-4 sm:size-3", reaction === "helpful" && "fill-current")} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedback("not_helpful")}
                  disabled={pendingActions.has("not_helpful")}
                  className={cn(actionButtonClass, reaction === "not_helpful" && "text-amber-500 opacity-100 md:opacity-100")}
                  title="Not helpful"
                  aria-label={reaction === "not_helpful" ? "Marked not helpful. Tap to remove." : "Mark response not helpful"}
                  aria-pressed={reaction === "not_helpful"}
                >
                  {pendingActions.has("not_helpful") ? (
                    <Loader2Icon className="size-4 animate-spin sm:size-3" />
                  ) : (
                    <ThumbsDownIcon className={cn("size-4 sm:size-3", reaction === "not_helpful" && "fill-current")} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedback("bad_citation")}
                  disabled={pendingActions.has("bad_citation")}
                  className={cn(actionButtonClass, flags.bad_citation && "text-amber-500 opacity-100 md:opacity-100")}
                  title={flags.bad_citation ? "Bad citation reported" : "Bad citation"}
                  aria-label={flags.bad_citation ? "Reported a bad citation. Tap to undo." : "Report a bad citation"}
                  aria-pressed={!!flags.bad_citation}
                >
                  {pendingActions.has("bad_citation") ? (
                    <Loader2Icon className="size-4 animate-spin sm:size-3" />
                  ) : (
                    <FileWarningIcon className="size-4 sm:size-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void submitFeedback("missed_source")}
                  disabled={pendingActions.has("missed_source")}
                  className={cn(actionButtonClass, flags.missed_source && "text-amber-500 opacity-100 md:opacity-100")}
                  title={flags.missed_source ? "Missed source reported" : "Missed source"}
                  aria-label={flags.missed_source ? "Reported a missed source. Tap to undo." : "Report a missed source"}
                  aria-pressed={!!flags.missed_source}
                >
                  {pendingActions.has("missed_source") ? (
                    <Loader2Icon className="size-4 animate-spin sm:size-3" />
                  ) : (
                    <SearchXIcon className="size-4 sm:size-3" />
                  )}
                </button>
                <ReportButton messageId={message.id} className={actionButtonClass} />
                {message.factCheck && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        className={cn(
                          actionButtonClass,
                          message.factCheck.accurate
                            ? "text-emerald-500/70 hover:text-emerald-500 opacity-100 md:opacity-100"
                            : "text-amber-500/70 hover:text-amber-500 opacity-100 md:opacity-100"
                        )}
                        aria-label={message.factCheck.accurate ? "Fact check passed" : "Fact check flagged"}
                      >
                        {message.factCheck.accurate
                          ? <ShieldCheckIcon className="size-4 sm:size-3" />
                          : <ShieldAlertIcon className="size-4 sm:size-3" />}
                      </TooltipTrigger>
                      <TooltipContent side="top" align="start">
                        {message.factCheck.note || (message.factCheck.accurate ? "Consistent with game documents" : "May conflict with game documents")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
              title={copiedKey === "prompt" ? "Copied" : "Copy prompt"}
              aria-label={copiedKey === "prompt" ? "Prompt copied" : "Copy prompt"}
            >
              {copiedKey === "prompt" ? (
                <CheckIcon className="size-4 text-emerald-500 sm:size-3" />
              ) : (
                <CopyIcon className="size-4 sm:size-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
