#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";

const API_BASE_URL = "https://www.thebluealliance.com/api/v3";
const REQUEST_TIMEOUT_MS = 10_000;

function getApiKey() {
  const apiKey = process.env.TBA_API_KEY;

  if (!apiKey) {
    throw new Error("TBA_API_KEY is not configured.");
  }

  return apiKey;
}

function normalizeTeamKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  if (/^frc\d+$/.test(trimmed)) {
    return trimmed;
  }

  const numberMatch = trimmed.match(/\d+/);
  if (!numberMatch) {
    throw new Error(`Invalid team identifier: ${value}`);
  }

  return `frc${numberMatch[0]}`;
}

function normalizeEventKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  if (!/^20\d{2}[a-z0-9]+$/.test(trimmed)) {
    throw new Error(`Invalid event key: ${value}`);
  }

  return trimmed;
}

function normalizeMatchKey(value) {
  const trimmed = String(value).trim().toLowerCase();

  if (!/^20\d{2}[a-z0-9]+_(?:qm|ef|qf|sf|f)\d+m\d+$/.test(trimmed)) {
    throw new Error(`Invalid match key: ${value}`);
  }

  return trimmed;
}

function buildTbaUrl(pathname) {
  return `${API_BASE_URL}${pathname}`;
}

async function tbaFetch(pathname) {
  const response = await fetch(buildTbaUrl(pathname), {
    headers: {
      "X-TBA-Auth-Key": getApiKey(),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`TBA ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return {
    url: buildTbaUrl(pathname),
    data: await response.json(),
  };
}

function resultToText(title, payload) {
  return `${title}\n${JSON.stringify(payload, null, 2)}`;
}

const resultSchema = {
  ok: z.boolean(),
  url: z.string(),
  data: z.any(),
};

const server = new McpServer(
  {
    name: "curator-tba",
    version: "1.0.0",
  },
  {
    capabilities: {
      logging: {},
    },
  },
);

server.registerTool(
  "get_team",
  {
    description: "Get summary information for an FRC team from The Blue Alliance.",
    inputSchema: {
      team: z.string().describe("Team number like 1676 or team key like frc1676."),
    },
    outputSchema: resultSchema,
  },
  async ({ team }) => {
    const teamKey = normalizeTeamKey(team);
    const payload = await tbaFetch(`/team/${teamKey}/simple`);

    return {
      content: [{ type: "text", text: resultToText(`Team ${teamKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_team_events",
  {
    description: "Get the list of events for a team in a specific season.",
    inputSchema: {
      team: z.string().describe("Team number like 1676 or team key like frc1676."),
      year: z.number().int().min(2002).describe("Season year, for example 2026."),
    },
    outputSchema: resultSchema,
  },
  async ({ team, year }) => {
    const teamKey = normalizeTeamKey(team);
    const payload = await tbaFetch(`/team/${teamKey}/events/${year}/simple`);

    return {
      content: [{ type: "text", text: resultToText(`Events for ${teamKey} in ${year}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_events_by_year",
  {
    description: "Get all simple FRC events for a specific season year from The Blue Alliance.",
    inputSchema: {
      year: z.number().int().min(2002).describe("Season year, for example 2026."),
    },
    outputSchema: resultSchema,
  },
  async ({ year }) => {
    const payload = await tbaFetch(`/events/${year}/simple`);

    return {
      content: [{ type: "text", text: resultToText(`Events in ${year}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_event",
  {
    description: "Get summary information for an FRC event from The Blue Alliance.",
    inputSchema: {
      event: z.string().describe("Event key like 2026njski."),
    },
    outputSchema: resultSchema,
  },
  async ({ event }) => {
    const eventKey = normalizeEventKey(event);
    const payload = await tbaFetch(`/event/${eventKey}/simple`);

    return {
      content: [{ type: "text", text: resultToText(`Event ${eventKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_event_alliances",
  {
    description: "Get playoff alliances for an FRC event from The Blue Alliance.",
    inputSchema: {
      event: z.string().describe("Event key like 2026mrcmp."),
    },
    outputSchema: resultSchema,
  },
  async ({ event }) => {
    const eventKey = normalizeEventKey(event);
    const payload = await tbaFetch(`/event/${eventKey}/alliances`);

    return {
      content: [{ type: "text", text: resultToText(`Alliances for ${eventKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_event_rankings",
  {
    description: "Get qualification rankings for an FRC event from The Blue Alliance.",
    inputSchema: {
      event: z.string().describe("Event key like 2026njski."),
    },
    outputSchema: resultSchema,
  },
  async ({ event }) => {
    const eventKey = normalizeEventKey(event);
    const payload = await tbaFetch(`/event/${eventKey}/rankings`);

    return {
      content: [{ type: "text", text: resultToText(`Rankings for ${eventKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_event_matches",
  {
    description: "Get simplified match data for an FRC event from The Blue Alliance.",
    inputSchema: {
      event: z.string().describe("Event key like 2026njski."),
    },
    outputSchema: resultSchema,
  },
  async ({ event }) => {
    const eventKey = normalizeEventKey(event);
    const payload = await tbaFetch(`/event/${eventKey}/matches/simple`);

    return {
      content: [{ type: "text", text: resultToText(`Matches for ${eventKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_team_event_status",
  {
    description: "Get a team's status at a specific event from The Blue Alliance.",
    inputSchema: {
      team: z.string().describe("Team number like 1676 or team key like frc1676."),
      event: z.string().describe("Event key like 2026njski."),
    },
    outputSchema: resultSchema,
  },
  async ({ team, event }) => {
    const teamKey = normalizeTeamKey(team);
    const eventKey = normalizeEventKey(event);
    const payload = await tbaFetch(`/team/${teamKey}/event/${eventKey}/status`);

    return {
      content: [{ type: "text", text: resultToText(`Status for ${teamKey} at ${eventKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

server.registerTool(
  "get_match",
  {
    description: "Get full data for a specific FRC match from The Blue Alliance.",
    inputSchema: {
      match: z.string().describe("Match key like 2026njski_qm1."),
    },
    outputSchema: resultSchema,
  },
  async ({ match }) => {
    const matchKey = normalizeMatchKey(match);
    const payload = await tbaFetch(`/match/${matchKey}`);

    return {
      content: [{ type: "text", text: resultToText(`Match ${matchKey}`, payload.data) }],
      structuredContent: { ok: true, url: payload.url, data: payload.data },
    };
  },
);

const transport = new StdioServerTransport();

try {
  await server.connect(transport);
} catch (error) {
  console.error(error);
  process.exit(1);
}
