import { describe, expect, it } from "vitest";
import { normalizeConversation } from "@/lib/conversations";

describe("conversation normalization", () => {
  it("preserves nullable project ids", () => {
    expect(normalizeConversation({
      id: "22222222-2222-2222-2222-222222222222",
      title: "Autos",
      searchDescription: null,
      seasonYear: 2026,
      isPublic: false,
      projectId: "33333333-3333-3333-3333-333333333333",
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:01:00.000Z",
    }).projectId).toBe("33333333-3333-3333-3333-333333333333");

    expect(normalizeConversation({
      id: "22222222-2222-2222-2222-222222222222",
      title: "Autos",
      seasonYear: 2026,
      isPublic: false,
      projectId: null,
      createdAt: "2026-04-25T12:00:00.000Z",
      updatedAt: "2026-04-25T12:01:00.000Z",
    }).projectId).toBeNull();
  });
});
