import { describe, expect, it } from "vitest";

import { TBA_TOOLS, type TbaToolName } from "@/lib/tba-mcp-client";

const EXPECTED_TOOLS: TbaToolName[] = [
  "get_team",
  "get_team_events",
  "get_events_by_year",
  "get_event",
  "get_event_alliances",
  "get_event_rankings",
  "get_event_matches",
  "get_team_event_status",
  "get_match",
  "get_event_teams",
  "get_team_awards",
  "get_team_event_matches",
  "get_team_years",
];

describe("TBA_TOOLS", () => {
  it("exports all expected tools", () => {
    const names = TBA_TOOLS.map((t) => t.function.name);
    for (const expected of EXPECTED_TOOLS) {
      expect(names).toContain(expected);
    }
  });

  it("has no duplicate tool names", () => {
    const names = TBA_TOOLS.map((t) => t.function.name);
    expect(names.length).toBe(new Set(names).size);
  });

  it("every tool has type 'function'", () => {
    for (const tool of TBA_TOOLS) {
      expect(tool.type).toBe("function");
    }
  });

  it("every tool has a non-empty description", () => {
    for (const tool of TBA_TOOLS) {
      expect(tool.function.description.trim().length).toBeGreaterThan(20);
    }
  });

  it("every tool's required fields are a subset of its properties", () => {
    for (const tool of TBA_TOOLS) {
      const props = Object.keys(tool.function.parameters.properties as Record<string, unknown>);
      const required = (tool.function.parameters.required as string[]) ?? [];
      for (const req of required) {
        expect(props).toContain(req);
      }
    }
  });

  describe("team parameter tools", () => {
    const teamTools: TbaToolName[] = [
      "get_team",
      "get_team_events",
      "get_team_event_status",
      "get_team_awards",
      "get_team_event_matches",
      "get_team_years",
    ];

    for (const name of teamTools) {
      it(`${name} has team as a required parameter`, () => {
        const tool = TBA_TOOLS.find((t) => t.function.name === name);
        expect(tool).toBeDefined();
        const required = tool!.function.parameters.required as string[];
        expect(required).toContain("team");
      });
    }
  });

  describe("event parameter tools", () => {
    const eventTools: TbaToolName[] = [
      "get_event",
      "get_event_alliances",
      "get_event_rankings",
      "get_event_matches",
      "get_team_event_status",
      "get_event_teams",
      "get_team_event_matches",
    ];

    for (const name of eventTools) {
      it(`${name} has event as a required parameter`, () => {
        const tool = TBA_TOOLS.find((t) => t.function.name === name);
        expect(tool).toBeDefined();
        const required = tool!.function.parameters.required as string[];
        expect(required).toContain("event");
      });
    }
  });

  describe("optional parameters", () => {
    it("get_team_awards does not require year", () => {
      const tool = TBA_TOOLS.find((t) => t.function.name === "get_team_awards");
      expect(tool).toBeDefined();
      const required = tool!.function.parameters.required as string[];
      expect(required).not.toContain("year");
      const props = tool!.function.parameters.properties as Record<string, unknown>;
      expect(props).toHaveProperty("year");
    });
  });

  describe("descriptions mention disambiguation where needed", () => {
    it("get_event_matches description mentions get_team_event_matches as the narrower alternative", () => {
      const tool = TBA_TOOLS.find((t) => t.function.name === "get_event_matches");
      expect(tool!.function.description).toContain("get_team_event_matches");
    });

    it("get_event_matches description mentions get_match for detailed breakdowns", () => {
      const tool = TBA_TOOLS.find((t) => t.function.name === "get_event_matches");
      expect(tool!.function.description).toContain("get_match");
    });

    it("get_team description mentions other tools for events and years", () => {
      const tool = TBA_TOOLS.find((t) => t.function.name === "get_team");
      expect(tool!.function.description).toContain("get_team_events");
      expect(tool!.function.description).toContain("get_team_years");
    });

    it("get_events_by_year description mentions get_event as the preferred alternative when key is known", () => {
      const tool = TBA_TOOLS.find((t) => t.function.name === "get_events_by_year");
      expect(tool!.function.description).toContain("get_event");
    });
  });
});
