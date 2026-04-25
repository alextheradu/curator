import { describe, expect, it } from "vitest";
import { deriveProjectSidebar } from "@/lib/sidebar-projects";
import type { Project } from "@/lib/projects";
import type { Conversation } from "@/lib/store";

function conversation(id: string, projectId: string | null, updatedAt: string): Conversation {
  return {
    id,
    projectId,
    title: id,
    searchDescription: null,
    messages: [],
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
    seasonYear: 2026,
    isPublic: false,
    chatMode: "veteran",
  };
}

const projects: Project[] = [
  {
    id: "p1",
    name: "Strategy",
    icon: "folder",
    color: "teal",
    createdAt: new Date("2026-04-25T00:00:00Z"),
    updatedAt: new Date("2026-04-25T00:00:00Z"),
  },
  {
    id: "p2",
    name: "Build",
    icon: "wrench",
    color: "amber",
    createdAt: new Date("2026-04-25T00:00:00Z"),
    updatedAt: new Date("2026-04-25T00:00:00Z"),
  },
];

describe("deriveProjectSidebar", () => {
  it("nests project chats and excludes them from history", () => {
    const result = deriveProjectSidebar(projects, [
      conversation("c1", "p1", "2026-04-25T12:00:00Z"),
      conversation("c2", null, "2026-04-25T13:00:00Z"),
      conversation("c3", "p1", "2026-04-25T14:00:00Z"),
    ]);

    expect(result.history.map((item) => item.id)).toEqual(["c2"]);
    expect(result.projects[0].project.id).toBe("p1");
    expect(result.projects[0].conversations.map((item) => item.id)).toEqual(["c3", "c1"]);
    expect(result.projects[1].project.id).toBe("p2");
    expect(result.projects[1].conversations).toEqual([]);
  });
});
