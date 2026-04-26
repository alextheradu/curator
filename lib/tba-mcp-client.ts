import "server-only";

import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type OpenAiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export const TBA_TOOLS: OpenAiTool[] = [
  {
    type: "function",
    function: {
      name: "get_team",
      description: "Get information about an FRC team (name, location, rookie year). Use for any question about a specific team.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Team number like '254' or team key like 'frc254'." },
        },
        required: ["team"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_events",
      description: "Get events a team is attending in a season — including district events, regionals, and championship division assignments.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Team number like '254' or team key like 'frc254'." },
          year: { type: "number", description: "Season year, e.g. 2026." },
        },
        required: ["team", "year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_events_by_year",
      description: "Get all FRC events for a season. Use to find an event key when you only know a partial name or location.",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number", description: "Season year, e.g. 2026." },
        },
        required: ["year"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event",
      description: "Get details for a specific FRC event (name, dates, location) given its event key.",
      parameters: {
        type: "object",
        properties: {
          event: { type: "string", description: "Event key like '2026njski'." },
        },
        required: ["event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_alliances",
      description: "Get playoff alliance selections and results for an event. Use to find the winner or alliance compositions.",
      parameters: {
        type: "object",
        properties: {
          event: { type: "string", description: "Event key like '2026mrcmp'." },
        },
        required: ["event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_rankings",
      description: "Get qualification rankings for an FRC event.",
      parameters: {
        type: "object",
        properties: {
          event: { type: "string", description: "Event key like '2026njski'." },
        },
        required: ["event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_matches",
      description: "Get the match schedule and scores for an FRC event.",
      parameters: {
        type: "object",
        properties: {
          event: { type: "string", description: "Event key like '2026njski'." },
        },
        required: ["event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_event_status",
      description: "Get a team's ranking, alliance selection, and playoff status at a specific event.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Team number like '254' or team key like 'frc254'." },
          event: { type: "string", description: "Event key like '2026njski'." },
        },
        required: ["team", "event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_match",
      description: "Get full data for a specific match including scores and teams.",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "Match key like '2026njski_qm1'." },
        },
        required: ["match"],
      },
    },
  },
];

export type TbaToolName =
  | "get_team"
  | "get_team_events"
  | "get_events_by_year"
  | "get_event"
  | "get_event_alliances"
  | "get_event_rankings"
  | "get_event_matches"
  | "get_team_event_status"
  | "get_match";

type JsonObject = Record<string, unknown>;

let clientPromise: Promise<Client> | null = null;

async function createClient() {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(process.cwd(), "scripts", "tba-mcp-server.mjs")],
    env,
    stderr: "pipe",
  });

  const stderr = transport.stderr;
  stderr?.on("data", (chunk) => {
    const message = chunk.toString().trim();
    if (message) {
      console.error("[tba-mcp]", message);
    }
  });

  const client = new Client(
    { name: "curator-server", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  return client;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = createClient().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }

  return clientPromise;
}

export async function callTbaTool<T = JsonObject>(
  name: TbaToolName,
  args: JsonObject,
): Promise<{ data: T; url?: string }> {
  const client = await getClient();
  const result = await client.callTool({ name, arguments: args });

  if (result.isError) {
    const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
    const text = content
      .filter((entry): entry is { type: "text"; text: string } => entry.type === "text" && typeof entry.text === "string")
      .map((entry) => entry.text)
      .join("\n")
      .trim();

    throw new Error(text || `TBA MCP tool ${name} failed.`);
  }

  const structured = result.structuredContent as { data?: T; url?: string } | undefined;
  if (!structured || !("data" in structured)) {
    throw new Error(`TBA MCP tool ${name} returned no structured content.`);
  }

  return {
    data: structured.data as T,
    url: structured.url,
  };
}
