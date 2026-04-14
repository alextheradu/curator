"use client";

import { Trash2 } from "lucide-react";
import { SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import type { Conversation } from "@/lib/store";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: Props) {
  return (
    <div className="group/item relative">
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        className="h-8 rounded-lg px-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      >
        <span className="truncate">{conversation.title}</span>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete conversation"
        className="right-1 rounded-md text-sidebar-foreground/30 hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
      </SidebarMenuAction>
    </div>
  );
}
