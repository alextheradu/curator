"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function StreamingIndicator() {
  const dotVariants = {
    initial: { scale: 0.6, opacity: 0.4 },
    animate: { scale: 1, opacity: 1 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-frc-blue/20 border border-frc-blue/30">
        <Bot size={14} className="text-frc-blue" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-elevated border border-surface-border">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", delay: i * 0.2 }}
            className="block w-1.5 h-1.5 rounded-full bg-frc-blue"
          />
        ))}
        <motion.svg
          width="12" height="10" viewBox="0 0 12 10"
          className="ml-1 text-frc-blue/40"
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M1 1L6 5L1 9M6 1L11 5L6 9"
            stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}
