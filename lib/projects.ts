export const PROJECT_ICONS = [
  { key: "folder", label: "Folder" },
  { key: "bot", label: "Bot" },
  { key: "book-open", label: "Book" },
  { key: "wrench", label: "Wrench" },
  { key: "trophy", label: "Trophy" },
  { key: "users", label: "Team" },
  { key: "rocket", label: "Rocket" },
  { key: "target", label: "Target" },
  { key: "clipboard-list", label: "Checklist" },
  { key: "sparkles", label: "Sparkles" },
] as const;

export const PROJECT_COLORS = [
  { key: "teal", label: "Teal", className: "bg-teal-400/18 text-teal-100 ring-teal-300/25" },
  { key: "amber", label: "Amber", className: "bg-amber-400/18 text-amber-100 ring-amber-300/25" },
  { key: "rose", label: "Rose", className: "bg-rose-400/18 text-rose-100 ring-rose-300/25" },
  { key: "blue", label: "Blue", className: "bg-sky-400/18 text-sky-100 ring-sky-300/25" },
  { key: "green", label: "Green", className: "bg-emerald-400/18 text-emerald-100 ring-emerald-300/25" },
  { key: "violet", label: "Violet", className: "bg-violet-400/18 text-violet-100 ring-violet-300/25" },
] as const;

export type ProjectIconKey = typeof PROJECT_ICONS[number]["key"];
export type ProjectColorKey = typeof PROJECT_COLORS[number]["key"];

export type ProjectRecord = {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type Project = {
  id: string;
  name: string;
  icon: ProjectIconKey;
  color: ProjectColorKey;
  createdAt: Date;
  updatedAt: Date;
};

export const DEFAULT_PROJECT_ICON: ProjectIconKey = "folder";
export const DEFAULT_PROJECT_COLOR: ProjectColorKey = "teal";

const ICON_KEYS = new Set<string>(PROJECT_ICONS.map((icon) => icon.key));
const COLOR_KEYS = new Set<string>(PROJECT_COLORS.map((color) => color.key));

export function isProjectIconKey(value: unknown): value is ProjectIconKey {
  return typeof value === "string" && ICON_KEYS.has(value);
}

export function isProjectColorKey(value: unknown): value is ProjectColorKey {
  return typeof value === "string" && COLOR_KEYS.has(value);
}

export function sanitizeProjectInput(input: {
  name?: unknown;
  icon?: unknown;
  color?: unknown;
}) {
  const rawName = typeof input.name === "string" ? input.name.trim() : "";
  return {
    name: (rawName || "New project").slice(0, 64),
    icon: isProjectIconKey(input.icon) ? input.icon : DEFAULT_PROJECT_ICON,
    color: isProjectColorKey(input.color) ? input.color : DEFAULT_PROJECT_COLOR,
  };
}

export function normalizeProject(project: ProjectRecord): Project {
  return {
    id: project.id,
    name: project.name,
    icon: isProjectIconKey(project.icon) ? project.icon : DEFAULT_PROJECT_ICON,
    color: isProjectColorKey(project.color) ? project.color : DEFAULT_PROJECT_COLOR,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}
