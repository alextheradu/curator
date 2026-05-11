"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

const SUGGESTION_GROUPS = {
  Rules: [
    "Summarize the 2026 bumper rules teams miss most often.",
    "Break down how ranking points are earned at 2026 events.",
    "Explain backup robot rules and how they're picked.",
    "Summarize the key 2026 robot inspection checks to verify.",
  ],
  Strategy: [
    "Explain the 2026 scoring flow in plain English.",
    "Explain which pre-match checks drivers usually confirm and why.",
    "Explain playoff alliance selection step by step.",
    "Compare two teams fairly from their event results.",
  ],
  Build: [
    "Explain how swerve and tank drives are mechanically different.",
    "Summarize common wiring mistakes on FRC robots.",
    "Explain what a drive coach is responsible for during a match.",
    "Explain what pit scouting is and how teams typically run it.",
  ],
  Awards: [
    "Explain how Impact Award judging works without writing an essay.",
    "Give feedback criteria for an outreach summary.",
    "List evidence a team should gather for awards season.",
    "Explain what judges usually look for in pit interviews.",
  ],
} as const;
const SUGGESTION_GROUP_NAMES = Object.keys(SUGGESTION_GROUPS) as Array<keyof typeof SUGGESTION_GROUPS>;
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
  "Beep boop",
  "Sup",
  "Greetings",
  "Heyo",
  "Salutations",
  "Ready when you are",
  "At your service",
  "Fancy seeing you here",
  "Good to see you",
  "Look who it is",
  "Hello hello",
  "What's cookin'",
  "How goes it",
];

function selectRandomSuggestions(count: number) {
  const pool = [...Object.values(SUGGESTION_GROUPS).flat()];

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
  const [activeGroup, setActiveGroup] = useState<keyof typeof SUGGESTION_GROUPS>("Rules");
  const [greetingPrefix] = useState(
    () => GREETING_PREFIXES[Math.floor(Math.random() * GREETING_PREFIXES.length)] ?? "Howdy"
  );
  const greetingName = getGreetingName(session?.user?.preferredName, session?.user?.name);
  const greeting = greetingName ? `${greetingPrefix}, ${greetingName}!` : `${greetingPrefix}!`;

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <div className="flex flex-col items-center justify-start gap-3 px-1 pb-6 pt-0 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute h-16 w-16 rounded-full bg-red-900/50 blur-xl" />
          <Image
            src="/logo.png"
            alt="Curator"
            width={64}
            height={64}
            priority
            sizes="64px"
            className="relative h-16 w-16 object-contain"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-3xl font-semibold tracking-tight text-foreground"
        >
          {greeting}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-sm text-center text-base leading-6 text-muted-foreground"
        >
          Ask about FRC rules, strategy, programming, or game documentation.
        </motion.div>
      </div>

      <div className="w-full px-1 pb-0">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Quick starts
          </p>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {SUGGESTION_GROUP_NAMES.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeGroup === group
                    ? "border-[#0066B3]/30 bg-[#0066B3]/10 text-[#8cc6f3]"
                    : "border-border/50 bg-card/30 text-muted-foreground hover:bg-card/60"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          {(SUGGESTION_GROUPS[activeGroup] ?? suggestions).map((suggestion, index) => (
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
                className="flex h-full w-full cursor-pointer items-center rounded-xl border border-border/50 bg-card/35 px-3 py-3 text-left text-sm leading-snug text-foreground/75 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)]"
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
