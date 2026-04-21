"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import { useChatStore, type Conversation } from "@/lib/store";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onRename: (title: string) => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onShare,
  onDelete,
}: Props) {
  const { typingTitleConversationId, typingTitle } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isTyping = typingTitleConversationId === conversation.id;
  const displayTitle = isTyping ? typingTitle : conversation.title;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftTitle(conversation.title);
    setIsEditing(true);
  };

  const commitRename = () => {
    const nextTitle = draftTitle.trim();
    setIsEditing(false);
    if (!nextTitle || nextTitle === conversation.title) {
      setDraftTitle(conversation.title);
      return;
    }
    onRename(nextTitle);
  };

  return (
    <div className="group/item relative">
      <SidebarMenuButton
        isActive={isActive}
        onClick={() => {
          if (!isEditing) {
            onClick();
          }
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEditing();
        }}
        className="h-8 rounded-lg px-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      >
        {isEditing ? (
          <input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                commitRename();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setDraftTitle(conversation.title);
                setIsEditing(false);
              }
            }}
            className="w-full bg-transparent text-[13px] text-inherit outline-none"
          />
        ) : (
          <span className="truncate">
            {displayTitle || "\u00A0"}
            {isTyping && (
              <span className="ml-px inline-block h-3 w-0.5 animate-pulse rounded-full bg-current align-middle" />
            )}
          </span>
        )}
      </SidebarMenuButton>
      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              showOnHover
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
              }}
              aria-label="Conversation options"
              className="right-1 rounded-md text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <MoreHorizontal className="size-3.5" />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            className="w-40 rounded-xl border border-border/60 bg-card/95"
          >
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                startEditing();
              }}
            >
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                onShare();
              }}
            >
              <Share2 className="size-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
