import "server-only";

import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

type TbaToolName =
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
  if (!structured?.data) {
    throw new Error(`TBA MCP tool ${name} returned no structured data.`);
  }

  return {
    data: structured.data,
    url: structured.url,
  };
}
