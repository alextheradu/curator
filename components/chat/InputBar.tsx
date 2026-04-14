"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Eraser, PauseCircle, Send, Sparkles } from "lucide-react";
import { estimateTokens } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INSERT_PROMPTS = [
  "Compare two drivetrain options",
  "Summarize the manual implications",
  "Generate Java command-based code",
];

interface Props {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function InputBar({ onSend, onStop, disabled, isStreaming }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const tokens = estimateTokens(value);
  const canSend = value.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {INSERT_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setValue((current) => (current ? `${current}\n${prompt}` : prompt))}
            className="rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/25 hover:bg-primary/8 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-[30px] p-3 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)]">
        <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/70 px-1 pb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex size-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles size={14} />
            </span>
            <div>
              <p className="font-semibold text-foreground">Prompt Curator</p>
              <p>Shift+Enter adds a newline.</p>
            </div>
          </div>
          <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            ~{tokens} tokens
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about rules, programming, strategy..."
          disabled={disabled}
          rows={1}
          className={cn(
            "min-h-[88px] w-full resize-none bg-transparent px-2 pb-2 pt-1 text-sm leading-7 outline-none",
            "placeholder:text-muted-foreground/80 text-foreground"
          )}
          style={{ maxHeight: "144px" }}
        />

        <div className="flex flex-col gap-3 px-1 pt-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CornerDownLeft size={12} />
            <span>Enter sends</span>
            <span className="text-border">•</span>
            <span>Curator may be wrong, verify official sources</span>
          </div>

          <div className="flex items-center gap-2">
            {value && !isStreaming && (
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setValue("")}>
                <Eraser size={14} />
                Clear
              </Button>
            )}
            <motion.div whileHover={!isStreaming && canSend ? { scale: 1.02 } : {}} whileTap={!isStreaming && canSend ? { scale: 0.98 } : {}}>
              <Button
                onClick={isStreaming ? onStop : handleSend}
                disabled={isStreaming ? false : !canSend}
                className={cn(
                  "h-11 rounded-full px-5 text-sm shadow-sm",
                  isStreaming
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "bg-[linear-gradient(135deg,var(--first-blue),var(--first-red))] text-white hover:opacity-95"
                )}
                aria-label={isStreaming ? "Stop" : "Send"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isStreaming ? (
                    <motion.span
                      key="stop"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="inline-flex items-center gap-2"
                    >
                      <PauseCircle size={16} />
                      Stop
                    </motion.span>
                  ) : (
                    <motion.span
                      key="send"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="inline-flex items-center gap-2"
                    >
                      <Send size={15} />
                      Send to Curator
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
