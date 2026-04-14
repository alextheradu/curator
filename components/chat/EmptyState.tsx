"use client";

import { motion } from "framer-motion";

const SUGGESTIONS = [
  "What are the key robot rules for the 2026 season?",
  "Explain this year's scoring system in plain English.",
  "Show me a Java command-based subsystem example.",
  "Compare swerve and tank drive for a defensive robot.",
];

interface Props {
  onPromptSelect: (prompt: string) => void;
}

export function EmptyState({ onPromptSelect }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 pb-40 pt-16">
      {/* Greeting */}
      <div className="flex flex-col items-center gap-3 px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
        >
          What can I help with?
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-sm text-muted-foreground/80"
        >
          Ask about FRC rules, strategy, programming, or game documentation.
        </motion.div>
      </div>

      {/* Suggested actions */}
      <div
        className="flex w-full gap-2.5 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible no-scrollbar"
      >
        {SUGGESTIONS.map((suggestion, index) => (
          <motion.div
            key={suggestion}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{
              delay: 0.06 * index,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="min-w-[200px] shrink-0 sm:min-w-0 sm:shrink"
          >
            <button
              type="button"
              onClick={() => onPromptSelect(suggestion)}
              className="h-auto w-full cursor-pointer whitespace-nowrap rounded-xl border border-border/50 bg-card/30 px-4 py-3 text-left text-[12px] leading-relaxed text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] sm:whitespace-normal sm:p-4 sm:text-[13px]"
            >
              {suggestion}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
