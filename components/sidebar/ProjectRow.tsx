"use client";

import type { ReactNode } from "react";
import { ChevronRight, MoreHorizontal, PenSquare, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuAction, SidebarMenuButton } from "@/components/ui/sidebar";
import type { Project } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { getProjectColorClass, ProjectIcon } from "./projectVisuals";

type ProjectRowProps = {
  project: Project;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
};

export function ProjectRow({
  project,
  count,
  expanded,
  onToggle,
  onNewChat,
  onEdit,
  onDelete,
  children,
}: ProjectRowProps) {
  return (
    <div className="group/project relative">
      <SidebarMenuButton
        onClick={onToggle}
        className="h-8 rounded-lg px-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", expanded && "rotate-90")} />
        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md ring-1", getProjectColorClass(project.color))}>
          <ProjectIcon icon={project.icon} className="size-3.5" />
        </span>
        <span className="truncate font-medium">{project.name}</span>
        <span className="ml-auto pr-5 text-[11px] text-sidebar-foreground/45">{count}</span>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            aria-label={`${project.name} options`}
            className="right-1 rounded-md text-sidebar-foreground/30 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <MoreHorizontal className="size-3.5" />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-40 rounded-xl border border-border/60 bg-card/95">
          <DropdownMenuItem onSelect={(event) => {
            event.preventDefault();
            onNewChat();
          }}>
            <PenSquare className="size-4" />
            New chat
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onSelect={(event) => {
              event.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {expanded && (
        <div className="mt-1 border-l border-sidebar-border/70 pl-3">
          {children}
        </div>
      )}
    </div>
  );
}
