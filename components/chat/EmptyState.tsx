"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";

const SUGGESTION_POOL = [
  "Explain the 2026 scoring flow in plain English.",
  "Summarize the key 2026 robot inspection checks to verify.",
  "Explain the tradeoffs between swerve and tank drive for defensive play.",
  "Break down how ranking points are earned at 2026 events.",
  "Explain playoff alliance selection step by step.",
  "Summarize the 2026 bumper rules teams miss most often.",
  "Explain which pre-match checks drivers usually confirm and why.",
  "Explain what strong pit scouting should capture.",
  "Compare two teams fairly from their event results.",
  "Summarize common wiring mistakes on FRC robots.",
  "Explain how to read rules and blue boxes together.",
  "Review a rule excerpt if I paste it below.",
  "Explain timeout coupons and backup robot rules.",
  "Explain what a drive coach is responsible for during a match.",
  "Review our scouting sheet if I paste it below.",
  "Review our auto plan if I paste it below.",
];

const VISIBLE_SUGGESTION_COUNT = 4;

function selectRandomSuggestions(count: number) {
  const pool = [...SUGGESTION_POOL];

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
  }

  return pool.slice(0, count);
}

interface Props {
  onPromptSelect: (prompt: string) => void;
}

export function EmptyState({ onPromptSelect }: Props) {
  const [suggestions] = useState(() => selectRandomSuggestions(VISIBLE_SUGGESTION_COUNT));

  return (
    <div className="flex w-full flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-6 pt-8 sm:gap-3 sm:pt-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src="/logo.png"
            alt="Curator"
            width={64}
            height={64}
            priority
            className="h-14 w-14 object-contain sm:h-16 sm:w-16"
            style={{ filter: "drop-shadow(0 0 24px rgba(140,50,50,0.55)) drop-shadow(0 0 8px rgba(120,40,40,0.4))" }}
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-[13ch] text-center text-2xl font-semibold tracking-tight text-foreground sm:max-w-none sm:text-2xl md:text-3xl"
        >
          What can I help with?
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-sm text-center text-sm leading-6 text-muted-foreground"
        >
          Ask about FRC rules, strategy, programming, or game documentation.
        </motion.div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <div className="mb-3 flex items-center justify-between px-1 sm:mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick starts
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => (
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
              className="min-w-0"
            >
              <button
                type="button"
                onClick={() => onPromptSelect(suggestion)}
                className="flex w-full cursor-pointer items-center rounded-2xl border border-border/50 bg-card/35 px-4 py-3.5 text-left text-[13px] leading-snug text-foreground/75 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] sm:rounded-xl sm:px-4 sm:py-3.5"
              >
                {suggestion}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
