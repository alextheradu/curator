"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function StreamingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-4 px-4 py-6 md:px-6"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
        <Bot size={18} />
      </div>
      <div className="glass-panel flex items-center gap-2 rounded-3xl px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={{ scale: 0.6, opacity: 0.4 }}
            animate={{ scale: [0.6, 1, 0.6], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              repeatType: "loop",
              delay: i * 0.16,
              ease: "easeInOut",
            }}
            className="block size-2 rounded-full bg-primary/60"
          />
        ))}
      </div>
    </motion.div>
  );
}
