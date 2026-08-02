"use client";

import { useRef, useState, useEffect, KeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from "react";
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

const SWIPE_DISMISS_THRESHOLD_PX = 40;

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
  // Guards against the same tap firing handleSend twice (e.g. a fast double
  // tap lands before React re-renders the disabled state onto the button).
  const sendingRef = useRef(false);

  // Restores a draft that never made it out (guest-limit block, failed
  // conversation create) - see ChatWindow's restoreDraft(). Only applies
  // when the box is empty so it never clobbers newer typing.
  useEffect(() => {
    const handleRestore = (event: Event) => {
      const detail = (event as CustomEvent<{ text: string }>).detail;
      if (!detail?.text || value.trim().length > 0) return;
      setValue(detail.text);
    };
    window.addEventListener("curator:restore-draft", handleRestore);
    return () => window.removeEventListener("curator:restore-draft", handleRestore);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const id = requestAnimationFrame(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    });
    return () => cancelAnimationFrame(id);
  }, [value]);

  // always focus on capacitor so keyboard pops like a real app.
  // skip on mobile web so we don't keyboard-jack people.
  useEffect(() => {
    const isCapacitor = typeof window !== "undefined" && "Capacitor" in window;
    const isTouchDevice = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    if (isTouchDevice && !isCapacitor) return;
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming || sendingRef.current) return;
    sendingRef.current = true;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    // onSend is synchronous handoff (it queues the message or defers to a
    // consent modal) - release the guard on the next tick rather than
    // holding it open, so it only ever blocks a true same-tick double-fire.
    queueMicrotask(() => {
      sendingRef.current = false;
    });
  };

  // Tapping the send/stop button while the textarea is focused blurs the
  // textarea on pointerdown, which (via the `:has(textarea:focus)` padding
  // change on the composer's outer container) shifts the button's position
  // mid-tap. iOS Safari/WKWebView cancels click synthesis when the tap
  // target moves between pointerdown and pointerup, so the tap silently
  // only dismisses the keyboard and the click never fires - the reported
  // "requires two taps" bug. Blocking the default pointerdown behavior
  // keeps focus on the textarea through the tap so nothing shifts, and the
  // click still fires normally right after.
  const preventFocusLoss = (event: ReactPointerEvent | ReactMouseEvent) => {
    event.preventDefault();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // Swipe-down-to-dismiss: drag down from the textarea to close the
  // keyboard, mirroring the gesture most native chat apps support. Only
  // arms when the drag starts at the textarea's own scroll top - otherwise
  // a downward drag inside a tall multi-line draft would hijack scrolling
  // the draft back up instead of dismissing.
  const swipeStartRef = useRef<{ x: number; y: number; atTop: boolean } | null>(null);

  const handleTextareaTouchStart = (event: ReactTouchEvent<HTMLTextAreaElement>) => {
    const touch = event.touches[0];
    if (!touch || !focused) {
      swipeStartRef.current = null;
      return;
    }
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      atTop: (textareaRef.current?.scrollTop ?? 0) <= 0,
    };
  };

  const handleTextareaTouchMove = (event: ReactTouchEvent<HTMLTextAreaElement>) => {
    const start = swipeStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch || !start.atTop) return;

    const dy = touch.clientY - start.y;
    const dx = Math.abs(touch.clientX - start.x);

    if (dy > SWIPE_DISMISS_THRESHOLD_PX && dy > dx * 1.5) {
      swipeStartRef.current = null;
      textareaRef.current?.blur();
    }
  };

  const handleTextareaTouchEnd = () => {
    swipeStartRef.current = null;
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
            onTouchStart={handleTextareaTouchStart}
            onTouchMove={handleTextareaTouchMove}
            onTouchEnd={handleTextareaTouchEnd}
            onTouchCancel={handleTextareaTouchEnd}
            placeholder="Ask anything..."
            disabled={disabled}
            enterKeyHint="send"
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

          {/* inline send, shows in compact/empty mode */}
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
                  <button type="button" onPointerDown={preventFocusLoss} onMouseDown={preventFocusLoss} onClick={onStop} className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-200 hover:opacity-85 active:scale-95" aria-label="Stop">
                    <SquareIcon className="size-3.5" />
                  </button>
                ) : (
                  <button type="button" onPointerDown={preventFocusLoss} onMouseDown={preventFocusLoss} onClick={handleSend} disabled={!canSend} className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200", canSend ? "bg-foreground text-background hover:opacity-85 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground/25")} aria-label="Send">
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
                    <button type="button" onPointerDown={preventFocusLoss} onMouseDown={preventFocusLoss} onClick={onStop} className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-all duration-200 hover:opacity-85 active:scale-95 sm:h-7 sm:w-7" aria-label="Stop">
                      <SquareIcon className="size-3.5" />
                    </button>
                  ) : (
                    <button type="button" onPointerDown={preventFocusLoss} onMouseDown={preventFocusLoss} onClick={handleSend} disabled={!canSend} className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 sm:h-7 sm:w-7", canSend ? "bg-foreground text-background hover:opacity-85 active:scale-95" : "cursor-not-allowed bg-muted text-muted-foreground/25")} aria-label="Send">
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
