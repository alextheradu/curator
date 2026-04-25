import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROJECT_COLOR,
  DEFAULT_PROJECT_ICON,
  PROJECT_COLORS,
  PROJECT_ICONS,
  normalizeProject,
  sanitizeProjectInput,
} from "@/lib/projects";

describe("project helpers", () => {
  it("normalizes project rows with stable dates and defaults", () => {
    const project = normalizeProject({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Pit scouting",
      icon: "unknown",
      color: "unknown",
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:01:00.000Z",
    });

    expect(project).toMatchObject({
      id: "11111111-1111-1111-1111-111111111111",
      name: "Pit scouting",
      icon: DEFAULT_PROJECT_ICON,
      color: DEFAULT_PROJECT_COLOR,
    });
    expect(project.createdAt).toEqual(new Date("2026-04-25T12:00:00.000Z"));
    expect(project.updatedAt).toEqual(new Date("2026-04-25T12:01:00.000Z"));
  });

  it("sanitizes project input and clamps names", () => {
    expect(sanitizeProjectInput({
      name: `  ${"A".repeat(90)}  `,
      icon: PROJECT_ICONS[1].key,
      color: PROJECT_COLORS[1].key,
    })).toEqual({
      name: "A".repeat(64),
      icon: PROJECT_ICONS[1].key,
      color: PROJECT_COLORS[1].key,
    });
  });

  it("falls back to a useful default name", () => {
    expect(sanitizeProjectInput({ name: "   ", icon: "bad", color: "bad" })).toEqual({
      name: "New project",
      icon: DEFAULT_PROJECT_ICON,
      color: DEFAULT_PROJECT_COLOR,
    });
  });
});
