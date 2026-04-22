"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  compact?: boolean;
}

export function InputBar({ onSend, onStop, disabled, isStreaming, compact = false }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const id = requestAnimationFrame(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    });
    return () => cancelAnimationFrame(id);
  }, [value]);

  // Auto-focus on mount — desktop only (mobile would pop the keyboard immediately)
  useEffect(() => {
    const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouchDevice) return;
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "rounded-2xl border border-border/40 bg-card shadow-[var(--shadow-composer)] transition-shadow duration-300",
          focused && "shadow-[var(--shadow-composer-focus)]"
        )}
      >
        {/* Textarea + optional inline mobile button (compact/empty state) */}
        <div className="flex items-end sm:block">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask anything..."
            disabled={disabled}
            rows={1}
            className="min-h-[40px] w-full flex-1 resize-none bg-transparent px-4 py-2.5 text-base leading-relaxed placeholder:text-muted-foreground/35 focus:outline-none sm:min-h-12 sm:pb-1 sm:pt-3 sm:text-[13px]"
            style={{ maxHeight: "200px" }}
          />

          {/* Mobile inline button — only in compact/empty mode */}
          <AnimatePresence initial={false}>
            {compact && (
              <motion.div
                key="inline-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex shrink-0 items-center px-2 pb-1.5 sm:hidden"
              >
                {isStreaming ? (
                  <button type="button" onClick={onStop} className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-200 hover:opacity-85 active:scale-95" aria-label="Stop">
                    <SquareIcon className="size-3.5" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSend} disabled={!canSend} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200", canSend ? "bg-foreground text-background hover:opacity-85 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground/25")} aria-label="Send">
                    <ArrowUpIcon className="size-4" />
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom row: always on desktop, only in chat mode on mobile */}
        <AnimatePresence initial={false}>
          {!compact && (
            <motion.div
              key="bottom-bar"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-end px-3 pb-3 sm:justify-between sm:pb-2">
                <p className="hidden text-[11px] text-muted-foreground/50 select-none sm:block">
                  Enter to send · Shift+Enter for newline
                </p>
                {isStreaming ? (
                  <button type="button" onClick={onStop} className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-200 hover:opacity-85 active:scale-95 sm:h-7 sm:w-7" aria-label="Stop">
                    <SquareIcon className="size-3.5" />
                  </button>
                ) : (
                  <button type="button" onClick={handleSend} disabled={!canSend} className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 sm:h-7 sm:w-7", canSend ? "bg-foreground text-background hover:opacity-85 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground/25")} aria-label="Send">
                    <ArrowUpIcon className="size-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="px-1 text-center text-[10px] font-medium tracking-[0.01em] text-muted-foreground/45">
        Curator can make mistakes. Check important info.
      </p>
    </div>
  );
}
