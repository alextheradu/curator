"use client";

import { motion } from "framer-motion";
import { Bot, Zap } from "lucide-react";

const STARTER_PROMPTS = [
  "Explain the 2025 game objectives",
  "What are the robot weight limits?",
  "How do I program a PID controller in WPILib?",
  "What's the difference between auto and teleop periods?",
  "Help me plan a scouting spreadsheet",
  "Explain the alliance selection process",
];

interface Props {
  onPromptSelect: (prompt: string) => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

export function EmptyState({ onPromptSelect }: Props) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full px-8 py-16 text-center"
    >
      <motion.div variants={itemVariants} className="relative mb-6">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-frc-blue/10 border border-frc-blue/20">
          <Bot size={36} className="text-frc-blue" />
          <motion.div
            className="absolute inset-0 rounded-2xl border border-frc-blue/30"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <Zap size={14} className="absolute -top-1 -right-1 text-frc-yellow" />
      </motion.div>

      <motion.h2 variants={itemVariants} className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
        Welcome to Curator
      </motion.h2>
      <motion.p variants={itemVariants} className="text-sm text-text-muted mb-8 max-w-sm">
        Your AI-powered FIRST Robotics Competition assistant. Ask anything about FRC rules, programming, strategy, and more.
      </motion.p>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {STARTER_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPromptSelect(prompt)}
            className="text-left px-3.5 py-3 rounded-xl border border-surface-border bg-surface-elevated
              hover:border-frc-blue/40 hover:bg-frc-blue/5 transition-all duration-200
              text-sm text-text-muted hover:text-text-primary group"
          >
            <span className="text-frc-blue/60 mr-2 group-hover:text-frc-blue transition-colors">›</span>
            {prompt}
          </motion.button>
        ))}
      </motion.div>

      <motion.p variants={itemVariants} className="mt-8 text-xs text-text-muted/60">
        Powered by Gemma 3 27B via OpenRouter
      </motion.p>
    </motion.div>
  );
}
