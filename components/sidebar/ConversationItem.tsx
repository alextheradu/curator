"use client";

import { useEffect, useRef, useState } from "react";
import { FolderInput, FolderMinus, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuAction } from "@/components/ui/sidebar";
import type { Project } from "@/lib/projects";
import { useChatStore, type Conversation } from "@/lib/store";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onRename: (title: string) => void;
  onShare: () => void;
  onDelete: () => void;
  projects?: Project[];
  onMoveToProject?: (projectId: string) => void;
  onRemoveFromProject?: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onShare,
  onDelete,
  projects = [],
  onMoveToProject,
  onRemoveFromProject,
}: Props) {
  const { typingTitleConversationId, typingTitle } = useChatStore();
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchorX, setMenuAnchorX] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState(conversation.title);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const didScrollRef = useRef(false);
  const isTyping = typingTitleConversationId === conversation.id;
  const displayTitle = isTyping ? typingTitle : conversation.title;

  const clearPendingClick = () => {
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => clearPendingClick, []);

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

  const updateMenuAnchor = (clientX: number) => {
    const row = rowRef.current;
    if (!row) return;

    const rect = row.getBoundingClientRect();
    const clampedX = Math.max(16, Math.min(rect.width - 16, clientX - rect.left));
    setMenuAnchorX(clampedX);
  };

  return (
    <div
      ref={rowRef}
      className="group/item relative"
      onContextMenu={(event) => {
        if (isEditing) return;
        event.preventDefault();
        event.stopPropagation();
        clearPendingClick();
        updateMenuAnchor(event.clientX);
        setMenuOpen(true);
      }}
    >
      <SidebarMenuButton
        isActive={isActive}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touchStartRef.current = { x: t.clientX, y: t.clientY };
          didScrollRef.current = false;
        }}
        onTouchMove={(e) => {
          if (!touchStartRef.current) return;
          const t = e.touches[0];
          if (t && Math.abs(t.clientY - touchStartRef.current.y) > 6) {
            didScrollRef.current = true;
          }
        }}
        onTouchEnd={() => {
          touchStartRef.current = null;
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
          didScrollRef.current = false;
        }}
        onClick={(event) => {
          if (isEditing || didScrollRef.current || menuOpen) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();
          clearPendingClick();
          clickTimeoutRef.current = window.setTimeout(() => {
            clickTimeoutRef.current = null;
            onClick();
          }, 180);
        }}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearPendingClick();
          startEditing();
        }}
        className="h-8 rounded-lg px-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground max-md:h-10 max-md:rounded-xl max-md:px-3 max-md:text-[14px]"
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
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 size-px -translate-y-1/2 opacity-0"
              style={{ left: menuAnchorX ?? 16 }}
            />
          </DropdownMenuTrigger>
          <SidebarMenuAction
            showOnHover
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              clearPendingClick();
              updateMenuAnchor(event.currentTarget.getBoundingClientRect().left + event.currentTarget.offsetWidth / 2);
              setMenuOpen(true);
            }}
            aria-label="Conversation options"
            className="right-1 rounded-md text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground max-md:top-2 max-md:size-6 max-md:text-sidebar-foreground/45"
          >
            <MoreHorizontal className="size-3.5" />
          </SidebarMenuAction>
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
            {projects.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInput className="size-4" />
                  Move to project
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44 rounded-xl border border-border/60 bg-card/95">
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onSelect={(e) => {
                        e.preventDefault();
                        onMoveToProject?.(project.id);
                      }}
                    >
                      <span className="truncate">{project.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {conversation.projectId && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onRemoveFromProject?.();
                }}
              >
                <FolderMinus className="size-4" />
                Remove from project
              </DropdownMenuItem>
            )}
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
