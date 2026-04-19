"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function InputBar({ onSend, onStop, disabled, isStreaming }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
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
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card shadow-[var(--shadow-composer)] transition-shadow duration-300",
        focused && "shadow-[var(--shadow-composer-focus)]"
      )}
    >
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
        className="min-h-12 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed placeholder:text-muted-foreground/35 focus:outline-none sm:text-[13px]"
        style={{ maxHeight: "200px" }}
      />

      <div className="flex items-center justify-between px-3 pb-3 sm:pb-2">
        {/* Left: hint — hidden on mobile */}
        <p className="hidden text-[11px] text-muted-foreground/50 select-none sm:block">
          Enter to send · Shift+Enter for newline
        </p>

        {/* Right: stop or send */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-200 hover:opacity-85 active:scale-95 sm:h-7 sm:w-7"
            aria-label="Stop"
          >
            <SquareIcon className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 sm:h-7 sm:w-7",
              canSend
                ? "bg-foreground text-background hover:opacity-85 active:scale-95"
                : "cursor-not-allowed bg-muted text-muted-foreground/25"
            )}
            aria-label="Send"
          >
            <ArrowUpIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
