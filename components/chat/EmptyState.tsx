"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

const SUGGESTION_POOL = [
  "Explain the 2026 scoring flow in plain English.",
  "Summarize the key 2026 robot inspection checks to verify.",
  "Explain how swerve and tank drives are mechanically different.",
  "Break down how ranking points are earned at 2026 events.",
  "Explain playoff alliance selection step by step.",
  "Summarize the 2026 bumper rules teams miss most often.",
  "Explain which pre-match checks drivers usually confirm and why.",
  "Explain what pit scouting is and how teams typically run it.",
  "Compare two teams fairly from their event results.",
  "Summarize common wiring mistakes on FRC robots.",
  "Explain backup robot rules and how they're picked.",
  "Explain what a drive coach is responsible for during a match.",
]; 
const VISIBLE_SUGGESTION_COUNT = 4;
const GREETING_PREFIXES = [
  "Howdy",
  "Hey",
  "Hello",
  "Hi there",
  "Hi",
  "What's up",
  "How's it going",
  "Glad you're here",
  "Ahoy",
  "Hola",
  "Bonjour",
  "Ask about FRC",
  "Beep boop",
];

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

function getGreetingName(preferredName?: string | null, fullName?: string | null) {
  if (preferredName?.trim()) {
    return preferredName.trim().split(/\s+/)[0];
  }

  if (fullName?.trim()) {
    return fullName.trim().split(/\s+/)[0];
  }

  return null;
}

export function EmptyState({ onPromptSelect }: Props) {
  const { data: session } = useSession();
  const [suggestions] = useState(() => selectRandomSuggestions(VISIBLE_SUGGESTION_COUNT));
  const [greetingPrefix] = useState(
    () => GREETING_PREFIXES[Math.floor(Math.random() * GREETING_PREFIXES.length)] ?? "Howdy"
  );
  const greetingName = getGreetingName(session?.user?.preferredName, session?.user?.name);
  const greeting = greetingName ? `${greetingPrefix}, ${greetingName}!` : `${greetingPrefix}!`;

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <div className="flex flex-col items-center justify-start gap-2 px-1 pb-5 pt-0 text-center sm:gap-3 sm:pb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute h-10 w-10 rounded-full bg-red-900/50 blur-xl sm:h-14 sm:w-14" />
          <Image
            src="/logo.png"
            alt="Curator"
            width={56}
            height={56}
            priority
            className="relative h-10 w-10 object-contain sm:h-14 sm:w-14"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-2xl md:text-3xl"
        >
          {greeting}
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

      <div className="w-full px-1 pb-0">
        <div className="mb-1.5 flex items-center justify-between px-1 sm:mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick starts
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-1 sm:gap-2.5">
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
                className="flex h-full w-full cursor-pointer items-center rounded-lg border border-border/50 bg-card/35 px-2 py-1.5 text-left text-[11px] leading-snug text-foreground/75 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] sm:rounded-xl sm:px-4 sm:py-3.5 sm:text-[13px]"
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
