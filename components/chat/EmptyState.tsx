"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const STARTERS = [
  "What are the key robot rules for the 2026 season?",
  "Explain the scoring system for this year's game.",
  "How do I set up a WPILib command-based project?",
  "What is the robot weight limit?",
  "How does alliance selection work at district events?",
  "Show me a PID controller example in Java.",
];

interface Props { onPromptSelect: (prompt: string) => void; }

export function EmptyState({ onPromptSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ED1C24]">
        <Bot size={28} className="text-white" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-white">Ask Curator</h2>
      <p className="mb-8 max-w-sm text-sm text-[#8A8A8A]">
        Your AI knowledge base for FIRST Robotics Competition. Ask about rules, programming, strategy, and more.
      </p>
      <div className="grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTERS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect(prompt)}
            className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3 text-left text-sm text-[#F5F5F5] transition-colors hover:border-[#ED1C24]/40 hover:bg-[#242424]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
