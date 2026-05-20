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
      description: "Get basic identity info for an FRC team: nickname, school name, city/state/country, and rookie year. Use when asked about a team's name, location, or how long they've been in FRC. For events they're attending use get_team_events; for seasons active use get_team_years.",
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
      description: "Get events a team is registered for in a specific season - district events, regionals, and championship division assignment. Use when asked where a team is competing or what events they're attending this season.",
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
      description: "Get all FRC events in a season. Best used to look up an event key when you only know the event's name, city, or region - returns a large list. If you already have the event key, use get_event instead.",
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
      description: "Get details for a specific event: official name, dates, location, event type, and week number. Requires the event key (e.g. 2026njski). Use get_events_by_year first if you need to find the key from a name or location.",
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
      description: "Get playoff alliance selections and results for an event - which teams were picked, their seed, and playoff outcomes. Use when asked who won an event, who made playoffs, or what the alliance compositions looked like.",
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
      description: "Get qualification-round standings for an event: rank, W-L-T record, ranking points, and tiebreaker scores for every team. Use when asked about a team's qual rank, overall standings, or how rankings look at an event.",
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
      description: "Get simplified match list for an entire event - all qual and playoff matches with scores and alliance rosters. Use for event-wide overviews. For a single team's matches only, prefer get_team_event_matches. For detailed per-period score breakdown of one match, use get_match.",
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
      description: "Get a team's complete status at one event: qual rank, W-L-T record, alliance pick number, and playoff advancement. Best answer for 'how did team X do at event Y' or 'were they eliminated in semis'.",
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
      description: "Get full detailed data for a single match: component scores broken down by period, winning alliance, and team rosters. Use when asked for a detailed scoring breakdown of a specific match. Requires a match key (e.g. 2026njski_qm1).",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "Match key like '2026njski_qm1'." },
        },
        required: ["match"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_teams",
      description: "Get the list of all teams attending a specific FRC event. Use when asked which teams are competing at an event, for scouting prep, or to check if a specific team is registered.",
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
      name: "get_team_awards",
      description: "Get awards a team has won. Provide a year for that season only; omit year for all-time award history. Use when asked what awards a team has won, whether they've received Impact or Chairman's, or their full award record.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Team number like '254' or team key like 'frc254'." },
          year: { type: "number", description: "Season year, e.g. 2026. Omit for all-time awards." },
        },
        required: ["team"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_event_matches",
      description: "Get just one team's matches at a specific event - the qual and playoff rounds they participated in, with scores. More targeted than get_event_matches when you only need one team's schedule at one event.",
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
      name: "get_team_years",
      description: "Get the seasons a team has competed in as an array of years. Use when asked how long a team has been active, whether they're a veteran or newer team, or what years they participated in FRC.",
      parameters: {
        type: "object",
        properties: {
          team: { type: "string", description: "Team number like '254' or team key like 'frc254'." },
        },
        required: ["team"],
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
  | "get_match"
  | "get_event_teams"
  | "get_team_awards"
  | "get_team_event_matches"
  | "get_team_years";

type JsonObject = Record<string, unknown>;

let clientPromise: Promise<Client> | null = null;

async function createClient() {
  const env = {
    PATH: process.env.PATH ?? "",
    NODE_ENV: process.env.NODE_ENV ?? "",
    TBA_API_KEY: process.env.TBA_API_KEY ?? "",
  };

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
      console.error("[tba-mcp]", message.replace(/(x-tba-auth-key:\s*)\S+/gi, "$1[REDACTED]"));
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
  let result: Awaited<ReturnType<Client["callTool"]>>;
  try {
    result = await client.callTool({ name, arguments: args });
  } catch (error) {
    clientPromise = null;
    throw error;
  }

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
