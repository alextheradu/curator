"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { ArrowUpIcon, MoreHorizontalIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SearchMode } from "@/lib/search-activity";

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  compact?: boolean;
  factCheckEnabled?: boolean;
  onFactCheckChange?: (enabled: boolean) => void;
  deepSearchEnabled?: boolean;
  onDeepSearchChange?: (enabled: boolean) => void;
  searchMode?: SearchMode;
  onSearchModeChange?: (mode: SearchMode) => void;
  initialValue?: string;
}

export function InputBar({
  onSend,
  onStop,
  disabled,
  isStreaming,
  compact = false,
  factCheckEnabled = false,
  onFactCheckChange,
  deepSearchEnabled = false,
  onDeepSearchChange,
  searchMode: searchModeProp,
  onSearchModeChange,
  initialValue,
}: Props) {
  const [value, setValue] = useState(() => initialValue ?? "");
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
  const searchMode = searchModeProp ?? (deepSearchEnabled ? "deep" : "fast");
  const optionsActive = factCheckEnabled || searchMode !== "fast";
  const optionsLabel = `More options: Fact check ${factCheckEnabled ? "on" : "off"}, Search mode ${searchMode}`;
  const keepMenuOpen = (event: Event) => event.preventDefault();
  const handleSearchModeValueChange = (mode: string) => {
    if (mode !== "fast" && mode !== "balanced" && mode !== "deep") {
      return;
    }

    onSearchModeChange?.(mode);
    onDeepSearchChange?.(mode === "deep");
  };
  const renderOptionsMenu = () => (
    <DropdownMenuContent side="top" align="end" className="min-w-[13rem]">
      <DropdownMenuLabel>Options</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Search mode</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={searchMode} onValueChange={handleSearchModeValueChange}>
        <DropdownMenuRadioItem value="fast" onSelect={keepMenuOpen}>
          Fast
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="balanced" onSelect={keepMenuOpen}>
          Balanced
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="deep" onSelect={keepMenuOpen}>
          Deep search
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        checked={factCheckEnabled}
        onSelect={keepMenuOpen}
        onCheckedChange={(checked) => onFactCheckChange?.(checked)}
      >
        Fact check
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        data-slot="composer"
        className={cn(
          "rounded-2xl border border-border/40 bg-card shadow-[var(--shadow-composer)] transition-shadow duration-300",
          focused && "shadow-[var(--shadow-composer-focus)]"
        )}
      >
        {/* Textarea + inline send button (compact/empty state) */}
        <div className="flex items-end">
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
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            className="min-h-[40px] w-full flex-1 resize-none bg-transparent px-4 py-2.5 text-base leading-relaxed placeholder:text-muted-foreground/35 focus:outline-none sm:min-h-12 sm:pb-1 sm:pt-3 sm:text-[13px]"
            style={{ maxHeight: "200px" }}
          />

          {/* Inline send button — compact/empty mode on all screen sizes */}
          <AnimatePresence initial={false}>
            {compact && (
              <motion.div
                key="inline-btn"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="flex shrink-0 items-center gap-1 px-2 pb-1.5"
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                        optionsActive
                          ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/20"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      aria-label={optionsLabel}
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  {renderOptionsMenu()}
                </DropdownMenu>
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
                <div className="flex items-center gap-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 sm:h-7 sm:w-7",
                          optionsActive
                            ? "bg-blue-500/15 text-blue-400 hover:bg-blue-500/20"
                            : "text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground"
                        )}
                        aria-label={optionsLabel}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    {renderOptionsMenu()}
                  </DropdownMenu>
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
