import { describe, expect, it } from "vitest";

import { buildWebSearchQuery, shouldRunWebSearch } from "@/lib/web-search-decision";

// Helpers to keep repetitive arg lists short
const withRag = (count: number, score: number) => ({ ragHitCount: count, bestScore: score });
const noRag = withRag(0, 0);
const goodRag = withRag(5, 0.85);
const weakRag = withRag(3, 0.3);
const midRag = withRag(4, 0.55);

function search(query: string, { ragHitCount, bestScore }: { ragHitCount: number; bestScore: number }) {
  return shouldRunWebSearch(query, ragHitCount, bestScore);
}

describe("shouldRunWebSearch", () => {
  describe("explicit web search requests", () => {
    it("triggers on 'look up'", () => {
      expect(search("look up the bumper rules", goodRag)).toBe(true);
    });

    it("triggers on 'search the web'", () => {
      expect(search("search the web for team 254", goodRag)).toBe(true);
    });

    it("triggers on 'search online'", () => {
      expect(search("search online for FRC events", goodRag)).toBe(true);
    });

    it("triggers on 'check online'", () => {
      expect(search("check online for the latest scores", goodRag)).toBe(true);
    });

    it("triggers on 'google'", () => {
      expect(search("google team 1678 robot reveal", goodRag)).toBe(true);
    });

    it("triggers on 'web search'", () => {
      expect(search("do a web search for game manual", goodRag)).toBe(true);
    });
  });

  describe("freshness / recency hints", () => {
    const freshQueries = [
      "what are the latest team updates",
      "recent changes to the game manual",
      "current rankings at the event",
      "currently attending events",
      "what happened today",
      "results from yesterday",
      "what happened this week",
      "scores this month",
      "who qualified this year",
      "this season's game",
      "who is winning right now",
      "standings as of today",
      "any update on the manual",
      "latest updates from FIRST",
    ];

    for (const q of freshQueries) {
      it(`triggers on "${q}"`, () => {
        expect(search(q, goodRag)).toBe(true);
      });
    }
  });

  describe("zero RAG hits - always web search", () => {
    it("triggers with no RAG results even for a plain rule question", () => {
      expect(search("explain the intake rules", noRag)).toBe(true);
    });

    it("triggers with no RAG results even with a high-confidence explicit query", () => {
      expect(search("bumper color requirements 2026", noRag)).toBe(true);
    });
  });

  describe("live FRC data + FRC-specific patterns", () => {
    it("triggers for team + live info (results)", () => {
      expect(search("what were team 254's results at the regional", midRag)).toBe(true);
    });

    it("triggers for team + standings", () => {
      expect(search("what are the current standings for team 1678", midRag)).toBe(true);
    });

    it("triggers for event + rankings", () => {
      expect(search("show me the rankings for the district event", midRag)).toBe(true);
    });

    it("triggers for match scores at a championship", () => {
      expect(search("who won the championship match", midRag)).toBe(true);
    });

    it("triggers for Einstein results", () => {
      expect(search("who won at Einstein", midRag)).toBe(true);
    });

    it("triggers for scouting at a regional", () => {
      expect(search("what are the scouting results from the regional", midRag)).toBe(true);
    });

    it("triggers for alliance information at an event", () => {
      expect(search("who is the alliance captain at the event", midRag)).toBe(true);
    });

    it("triggers for championship qualification status", () => {
      expect(search("did team 4481 qualify for championship", midRag)).toBe(true);
    });
  });

  describe("acronym and short lookup queries", () => {
    it("triggers on acronym query with weak RAG", () => {
      expect(search("what does OPR mean", midRag)).toBe(true);
    });

    it("triggers on acronym query with low score", () => {
      expect(search("what is DPR abbreviation", { ragHitCount: 2, bestScore: 0.5 })).toBe(true);
    });

    it("triggers on lookup with score below 0.6", () => {
      expect(search("what does RP stand for", { ragHitCount: 3, bestScore: 0.55 })).toBe(true);
    });

    it("does not trigger acronym path when score is high enough", () => {
      expect(search("what does RP stand for", { ragHitCount: 5, bestScore: 0.75 })).toBe(false);
    });
  });

  describe("short lookup queries", () => {
    it("triggers on 'what is bumper' with weak RAG score", () => {
      expect(search("what is a bumper", { ragHitCount: 3, bestScore: 0.4 })).toBe(true);
    });

    it("does not trigger short lookup with strong score", () => {
      expect(search("what is a bumper", { ragHitCount: 5, bestScore: 0.7 })).toBe(false);
    });
  });

  describe("FRC-specific pattern with weak RAG score", () => {
    it("triggers for FRC team query with very weak score", () => {
      expect(search("tell me about team 254", weakRag)).toBe(true);
    });

    it("triggers for FRC event query with very weak score", () => {
      expect(search("how does the district event work", weakRag)).toBe(true);
    });

    it("does not trigger when FRC-specific but score is decent", () => {
      // no lookup or live hints. only FRC pattern fires but score > 0.35, so no trigger
      expect(search("explain the FRC robot weight limit", { ragHitCount: 4, bestScore: 0.5 })).toBe(false);
    });
  });

  describe("no trigger cases", () => {
    it("does not trigger for a well-covered rule question", () => {
      expect(search("what is the robot weight limit", goodRag)).toBe(false);
    });

    it("does not trigger for a general strategy question with good RAG", () => {
      expect(search("what makes a good defensive robot", goodRag)).toBe(false);
    });

    it("does not trigger for programming help with good RAG", () => {
      expect(search("how do I configure PID in WPILib", goodRag)).toBe(false);
    });
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
