"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { MessageSquareText, Trash2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { Conversation } from "@/lib/store";
import { SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: Props) {
  const lastMessage =
    conversation.messages.at(-1)?.content ?? "Start a new room for rules, strategy, scouting, or code.";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="relative"
    >
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        className="h-auto min-h-[88px] items-start rounded-2xl border border-transparent bg-background/60 px-3 py-3 pr-10 backdrop-blur transition-all hover:border-primary/15 hover:bg-background/90 data-[active=true]:border-primary/20 data-[active=true]:bg-primary/8"
      >
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
          <MessageSquareText size={16} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold leading-tight">{conversation.title}</p>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {conversation.seasonYear}
            </span>
          </div>
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {lastMessage}
          </p>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80">
            {formatTimestamp(new Date(conversation.updatedAt))}
          </p>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete conversation"
        className="right-2 top-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 size={12} />
      </SidebarMenuAction>
    </motion.div>
  );
}
