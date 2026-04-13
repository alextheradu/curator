"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface Props {
  citation: string;
}

export function CitationBadge({ citation }: Props) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono
        bg-frc-blue/10 border border-frc-blue/20 text-frc-blue/90
        hover:bg-frc-blue/20 transition-colors cursor-default"
    >
      <BookOpen size={10} />
      {citation}
    </motion.span>
  );
}
