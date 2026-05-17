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

const GREETINGS = [
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
  "Aloha",
  "Good morning",
  "Good afternoon",
  "Good evening",
];

function getGreeting(hour: number): string {
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const pool = GREETINGS.filter((g) => g !== "Good morning" && g !== "Good afternoon" && g !== "Good evening");
  pool.push(timeGreeting);
  return pool[Math.floor(Math.random() * pool.length)];
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

interface Props {
  onPromptSelect: (prompt: string) => void;
  isNativeIOS?: boolean;
}

function NativeEmptyState({ onPromptSelect: _ }: Props) {
  const { data: session } = useSession();

  const hour = new Date().getHours();
  const greetingName = getGreetingName(session?.user?.preferredName, session?.user?.name);
  const question = hour < 12
    ? "What can I help you with this morning?"
    : hour < 18
      ? "What can I help you with this afternoon?"
      : "What can I help you with this evening?";

  return (
    <div data-native-empty className="flex w-full flex-1 flex-col items-center justify-start gap-5 px-8 pt-[12svh] text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute h-20 w-20 rounded-full bg-red-900/50 blur-2xl" />
        <Image
          src="/logo.png"
          alt="Curator"
          width={72}
          height={72}
          priority
          sizes="72px"
          className="relative object-contain"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-2xl font-medium tracking-tight text-white"
      >
        {greetingName ? `How can I help you, ${greetingName}?` : question}
      </motion.h1>
    </div>
  );
}

export function EmptyState({ onPromptSelect, isNativeIOS = false }: Props) {
  const { data: session } = useSession();
  const [activeGroup, setActiveGroup] = useState<keyof typeof SUGGESTION_GROUPS>("Rules");

  if (isNativeIOS) {
    return <NativeEmptyState onPromptSelect={onPromptSelect} />;
  }

  const greetingBase = getGreeting(new Date().getHours());
  const greetingName = getGreetingName(session?.user?.preferredName, session?.user?.name);
  const greeting = greetingName ? `${greetingBase}, ${greetingName}` : greetingBase;

  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      <div className="flex flex-col items-center justify-start gap-4 px-1 pb-8 pt-0 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center justify-center"
        >
          <div className="absolute h-10 w-10 rounded-full bg-red-900/50 blur-xl md:h-14 md:w-14" />
          <Image
            src="/logo.png"
            alt="Curator"
            width={56}
            height={56}
            priority
            sizes="56px"
            className="relative h-10 w-10 object-contain md:h-14 md:w-14"
          />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center text-2xl font-medium tracking-tight text-foreground"
        >
          {greeting}
        </motion.h1>
      </div>

      <div className="w-full px-1 pb-0">
        <div className="mb-2 flex items-center justify-end px-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {SUGGESTION_GROUP_NAMES.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${
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
          {SUGGESTION_GROUPS[activeGroup].map((suggestion, index) => (
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
                className="flex h-full w-full cursor-pointer items-center rounded-xl border border-border/40 bg-card/35 px-2.5 py-3 text-left text-[11px] leading-snug text-foreground/75 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card/60 hover:text-foreground hover:shadow-[var(--shadow-card)] md:px-3 md:py-3.5 md:text-xs"
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
