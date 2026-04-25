import { describe, expect, it } from "vitest";
import { buildProjectMemoryContext, compactProjectSummaryInput } from "@/lib/project-memory";

describe("project memory", () => {
  it("formats hidden project memory only when summary exists", () => {
    expect(buildProjectMemoryContext("")).toBe("");
    expect(buildProjectMemoryContext("The project is comparing drivetrains.")).toContain("Private project memory");
    expect(buildProjectMemoryContext("The project is comparing drivetrains.")).toContain("The project is comparing drivetrains.");
  });

  it("bounds summary model input", () => {
    const input = compactProjectSummaryInput({
      previousSummary: "A".repeat(5000),
      userMessage: "B".repeat(5000),
      assistantMessage: "C".repeat(5000),
    });

    expect(input.length).toBeLessThanOrEqual(6500);
    expect(input).toContain("Previous summary:");
    expect(input).toContain("Latest user message:");
    expect(input).toContain("Latest assistant response:");
  });
});
