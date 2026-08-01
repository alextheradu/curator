import { describe, expect, it } from "vitest";

import { buildWebSearchQuery, needsCurrentFrcVerification } from "@/lib/web-search-decision";

describe("needsCurrentFrcVerification", () => {
  // The exact tester-reported prompts from the FRC reliability bug report.
  it("flags 'What was the 2026 FRC game?'", () => {
    expect(needsCurrentFrcVerification("What was the 2026 FRC game?", 2026)).toBe(true);
  });

  it("flags 'What's the height limit for Rebuilt?'", () => {
    expect(needsCurrentFrcVerification("What's the height limit for Rebuilt?", 2026)).toBe(true);
  });

  it("flags the misspelled 'hight limit' variant", () => {
    expect(needsCurrentFrcVerification("What is the hight limit for a robot in rebuilt?", 2026)).toBe(true);
  });

  it("flags 'Rules of FRC'", () => {
    expect(needsCurrentFrcVerification("Rules of FRC", 2026)).toBe(true);
  });

  it("flags current-game phrasing without an explicit year", () => {
    expect(needsCurrentFrcVerification("what is the current FRC game called", 2026)).toBe(true);
  });

  it("flags a weight limit question", () => {
    expect(needsCurrentFrcVerification("what's the max robot weight this season", 2026)).toBe(true);
  });

  it("does not flag an ordinary strategy question", () => {
    expect(needsCurrentFrcVerification("how should we practice alliance selection interviews", 2026)).toBe(false);
  });

  it("does not flag a general programming question", () => {
    expect(needsCurrentFrcVerification("how do I debounce a limit switch in Java", 2026)).toBe(false);
  });

  it("does not flag an empty query", () => {
    expect(needsCurrentFrcVerification("", 2026)).toBe(false);
  });

  it("does not flag a past-season year below the current season", () => {
    expect(needsCurrentFrcVerification("what was the 2019 FRC game", 2026)).toBe(false);
  });
});

describe("buildWebSearchQuery", () => {
  describe("FRC scope injection", () => {
    it("prepends FRC scope when query lacks FRC context", () => {
      const result = buildWebSearchQuery("bumper rules");
      expect(result).toContain("FIRST Robotics Competition");
      expect(result).toContain("bumper rules");
    });

    it("does not double-prepend when query mentions FRC", () => {
      const result = buildWebSearchQuery("FRC robot weight limit");
      expect(result).not.toContain("FIRST Robotics Competition (FRC) FIRST Robotics Competition");
      expect(result).toContain("FRC robot weight limit");
    });

    it("does not prepend when query mentions FIRST Robotics", () => {
      const result = buildWebSearchQuery("FIRST Robotics game reveal 2026");
      expect(result).not.toContain("FIRST Robotics Competition (FRC) FIRST Robotics");
      expect(result).toContain("FIRST Robotics game reveal 2026");
    });

    it("does not prepend when query mentions first inspires", () => {
      const result = buildWebSearchQuery("first inspires district event");
      expect(result).toContain("first inspires district event");
    });
  });

  describe("season year injection", () => {
    it("appends season year when freshness hint present and no year in query", () => {
      const result = buildWebSearchQuery("current rankings", 2026);
      expect(result).toContain("2026");
    });

    it("does not append year when query already has a year", () => {
      const result = buildWebSearchQuery("2025 game reveal", 2026);
      expect(result).not.toContain("2026");
    });

    it("does not append year when no seasonYear provided", () => {
      const result = buildWebSearchQuery("current rankings");
      expect(result).not.toMatch(/\b20\d{2}\b/);
    });

    it("does not append year when no freshness hint present", () => {
      const result = buildWebSearchQuery("bumper rules", 2026);
      expect(result).not.toMatch(/2026$/);
    });
  });

  describe("acronym handling", () => {
    it("appends 'abbreviation meaning' for standalone acronym queries", () => {
      // standalone acronym with no lookup hint gets "abbreviation meaning" appended
      const result = buildWebSearchQuery("OPR");
      expect(result).toContain("abbreviation meaning");
    });

    it("does not append 'abbreviation meaning' for non-acronym queries", () => {
      const result = buildWebSearchQuery("how do bumpers work");
      expect(result).not.toContain("abbreviation meaning");
    });
  });

  describe("edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(buildWebSearchQuery("")).toBe("");
      expect(buildWebSearchQuery("   ")).toBe("");
    });

    it("preserves whitespace-trimmed query", () => {
      const result = buildWebSearchQuery("  bumper rules  ");
      expect(result).toContain("bumper rules");
    });
  });
});
