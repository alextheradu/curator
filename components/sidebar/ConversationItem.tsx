"use client";

import { motion } from "framer-motion";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { Conversation } from "@/lib/store";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 ${
        isActive
          ? "bg-frc-blue/20 border border-frc-blue/30 text-text-primary"
          : "hover:bg-surface-border/60 text-text-muted hover:text-text-primary"
      }`}
      onClick={onClick}
    >
      <MessageSquare size={14} className="shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <p className="text-xs opacity-50 mt-0.5">
          {formatTimestamp(new Date(conversation.updatedAt))}
        </p>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-frc-red"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete conversation"
      >
        <Trash2 size={12} />
      </button>
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-frc-blue rounded-full"
        />
      )}
    </motion.div>
  );
}
