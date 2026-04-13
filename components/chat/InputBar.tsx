"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle } from "lucide-react";
import { estimateTokens } from "@/lib/utils";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function InputBar({ onSend, disabled, isStreaming }: Props) {
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
    <div className="px-4 pb-4 pt-2">
      <div className="input-glow rounded-2xl border border-surface-border bg-surface-elevated transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about FRC rules, programming, strategy..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-text-primary placeholder:text-text-muted resize-none outline-none leading-6 font-sans"
          style={{ maxHeight: "144px" }}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-text-muted/60 font-mono">
            ~{tokens} tokens · ⏎ send · ⇧⏎ newline
          </span>
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : {}}
            whileTap={canSend ? { scale: 0.95 } : {}}
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
              canSend
                ? "bg-frc-blue text-white hover:bg-frc-blue/90 shadow-[0_0_12px_rgba(21,101,192,0.4)]"
                : "bg-surface-border text-text-muted cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.span
                  key="stop"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-3 h-3 rounded-sm bg-current"
                />
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Send size={14} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-center mt-2">
        <AlertTriangle size={10} className="text-warning/60" />
        <p className="text-xs text-text-muted/50">
          Curator may make mistakes. Always verify with official FIRST materials.
        </p>
      </div>
    </div>
  );
}
