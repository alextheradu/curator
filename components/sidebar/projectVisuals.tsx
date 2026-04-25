"use client";

import {
  Bot,
  BookOpen,
  ClipboardList,
  Folder,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_PROJECT_COLOR,
  PROJECT_COLORS,
  type ProjectColorKey,
  type ProjectIconKey,
} from "@/lib/projects";

const ICONS: Record<ProjectIconKey, LucideIcon> = {
  folder: Folder,
  bot: Bot,
  "book-open": BookOpen,
  wrench: Wrench,
  trophy: Trophy,
  users: Users,
  rocket: Rocket,
  target: Target,
  "clipboard-list": ClipboardList,
  sparkles: Sparkles,
};

export function ProjectIcon({ icon, className }: { icon: ProjectIconKey; className?: string }) {
  const Icon = ICONS[icon] ?? Folder;
  return <Icon className={className} />;
}

export function getProjectColorClass(color: ProjectColorKey) {
  return PROJECT_COLORS.find((item) => item.key === color)?.className
    ?? PROJECT_COLORS.find((item) => item.key === DEFAULT_PROJECT_COLOR)?.className
    ?? "";
}
