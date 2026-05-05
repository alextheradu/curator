import { auth } from "@/auth";
import { readUserAccountSettings } from "@/lib/account-settings";
import { withSessionDbAccess } from "@/lib/db/access";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import { buildRagContext, RAG_SEARCH_TOOL } from "@/lib/rag";
import { webSearch } from "@/lib/langsearch";
import { DEFAULT_SEASON_YEAR } from "@/lib/seasons";
import { isTbaMcpEnabled } from "@/lib/tba";
import { callTbaTool, TBA_TOOLS, type TbaToolName, type OpenAiTool } from "@/lib/tba-mcp-client";
import { conversations, projects, type Citation } from "@/lib/db/schema";
import { buildProjectMemoryContext, compactProjectSummaryInput } from "@/lib/project-memory";
import { GUEST_MESSAGE_COUNT_COOKIE_NAME, GUEST_MESSAGE_LIMIT } from "@/lib/app-cookies";
import { serializeCookie } from "@/lib/cookies";
import { captureException } from "@/lib/logging";
import { applyRateLimitHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const CHAT_MODELS = (
  process.env.OPENROUTER_CHAT_MODELS
  ?? "openai/gpt-oss-120b:free,openai/gpt-4o-mini"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

function orHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Curator FRC Assistant",
  };
}

function encodeSse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const OPENROUTER_TIMEOUT_MS = 60_000;

function createAbortError(message = "The request was aborted.") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function isControllerClosedError(error: unknown) {
  return error instanceof TypeError && error.message.includes("Controller is already closed");
}

function formatProviderError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();
    return message || error.name || "Unknown error";
  }

  const message = String(error ?? "").trim();
  return message || "Unknown error";
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function joinNaturalList(parts: string[]) {
  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function describeAnswerInputs(
  ragCitations: Citation[],
  tbaCitations: Citation[],
  webCitations: Citation[],
) {
  const parts: string[] = [];

  if (ragCitations.length > 0) {
    parts.push(`${ragCitations.length} document ${pluralize(ragCitations.length, "page")}`);
  }

  if (webCitations.length > 0) {
    parts.push(`${webCitations.length} web ${pluralize(webCitations.length, "result")}`);
  }

  if (tbaCitations.length > 0) {
    parts.push(`${tbaCitations.length} TBA ${pluralize(tbaCitations.length, "result")}`);
  }

  return parts.length > 0 ? joinNaturalList(parts) : "";
}

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system" | "user" | "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

const WEB_SEARCH_TOOL: OpenAiTool = {
  type: "function",
  function: {
    name: "web_search",
    description: "Search the web for current FRC news, announcements, or supplementary context not available from The Blue Alliance. Use for recent news, rule Q&As, team updates, or anything TBA doesn't cover.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "A specific search query for current FRC content." },
      },
      required: ["query"],
    },
  },
};

function getTbaUserFacingUrl(toolName: string, args: Record<string, unknown>): string {
  const base = "https://www.thebluealliance.com";
  const teamArg = typeof args.team === "string" ? args.team.replace(/^frc/i, "") : null;
  const eventArg = typeof args.event === "string" ? args.event.toLowerCase() : null;
  const matchArg = typeof args.match === "string" ? args.match.toLowerCase() : null;
  const yearArg = typeof args.year === "number" ? args.year : null;

  if (matchArg) return `${base}/match/${matchArg}`;
  if (toolName === "get_team_event_status" && eventArg) return `${base}/event/${eventArg}`;
  if (eventArg) return `${base}/event/${eventArg}`;
  if (teamArg) return `${base}/team/${teamArg}`;
  if (yearArg) return `${base}/events/${yearArg}`;
  return base;
}

async function runFactCheck({
  apiKey,
  assistantText,
  ragContext,
  signal,
}: {
  apiKey: string;
  assistantText: string;
  ragContext: string;
  signal?: AbortSignal;
}): Promise<{ accurate: boolean; note: string }> {
  const timeoutSignal = AbortSignal.timeout(15_000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const resp = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: CHAT_MODELS[0],
      temperature: 0,
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content: 'You are a fact-checker for FRC robotics rule questions. Given game document excerpts and an answer, determine if the answer is accurate according to those documents. Reply ONLY with valid JSON: {"accurate": true, "note": "brief reason under 80 chars"}',
        },
        {
          role: "user",
          content: `GAME DOCUMENT EXCERPTS:\n${ragContext.slice(0, 4000)}\n\nANSWER TO VERIFY:\n${assistantText.slice(0, 1500)}`,
        },
      ],
    }),
    signal: combinedSignal,
  });

  if (!resp.ok) throw new Error(`Fact check HTTP ${resp.status}`);

  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in fact-check response");
  const parsed = JSON.parse(jsonMatch[0]) as { accurate?: boolean; note?: string };
  return {
    accurate: Boolean(parsed.accurate),
    note: String(parsed.note ?? "").slice(0, 100),
  };
}

async function runToolLoop({
  apiKey,
  messages,
  tools,
  seasonYear,
  sendEvent,
  signal,
}: {
  apiKey: string;
  messages: ChatMessage[];
  tools: OpenAiTool[];
  seasonYear: number;
  sendEvent: (payload: unknown) => void;
  signal?: AbortSignal;
}): Promise<{ messages: ChatMessage[]; tbaCitations: Citation[]; webCitations: Citation[]; ragCitations: Citation[]; ragContextBlocks: string[] }> {
  const tbaCitations: Citation[] = [];
  const webCitations: Citation[] = [];
  const ragCitations: Citation[] = [];
  const ragContextBlocks: string[] = [];
  let current: ChatMessage[] = [...messages];
  const MAX_ITERATIONS = 4;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) throw createAbortError();

    let responseMessage: { content: string | null; tool_calls?: ToolCall[] } | null = null;
    let finishReason: string | null = null;

    for (const model of CHAT_MODELS) {
      if (signal?.aborted) throw createAbortError();
      const timeoutSignal = AbortSignal.timeout(30_000);
      const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

      try {
        const resp = await fetch(OR_URL, {
          method: "POST",
          headers: orHeaders(apiKey),
          body: JSON.stringify({
            model,
            messages: current,
            tools,
            tool_choice: "auto",
            temperature: 0,
            max_tokens: 512,
          }),
          signal: combinedSignal,
        });

        if (!resp.ok) continue;

        const data = await resp.json() as {
          choices?: Array<{
            finish_reason: string;
            message: { role: string; content: string | null; tool_calls?: ToolCall[] };
          }>;
        };

        const choice = data.choices?.[0];
        if (!choice) continue;

        responseMessage = choice.message;
        finishReason = choice.finish_reason;
        break;
      } catch {
        continue;
      }
    }

    if (!responseMessage || finishReason !== "tool_calls" || !responseMessage.tool_calls?.length) {
      break;
    }

    current.push({ role: "assistant", content: responseMessage.content ?? null, tool_calls: responseMessage.tool_calls });

    for (const toolCall of responseMessage.tool_calls) {
      const { name, arguments: argsStr } = toolCall.function;
      let resultContent: string;

      try {
        const args = JSON.parse(argsStr) as Record<string, unknown>;

        if (name === "search_documents") {
          const query = typeof args.query === "string" ? args.query : String(args.query ?? "");
          const limit = typeof args.limit === "number" ? Math.min(Math.max(args.limit, 1), 20) : 6;
          const toolSeasonYear = typeof args.season_year === "number" ? args.season_year : seasonYear;
          sendEvent({ type: "status", message: "Searching indexed FRC documents..." });

          const ragResult = await buildRagContext(query, toolSeasonYear, {
            limit,
            sourceOffset: ragCitations.length,
            onStatus: (msg) => sendEvent({ type: "status", message: msg }),
          });

          ragCitations.push(...ragResult.citations);
          if (ragResult.hitCount > 0) ragContextBlocks.push(ragResult.contextBlock);
          resultContent = ragResult.hitCount > 0
            ? ragResult.contextBlock
            : "No matching document chunks found for this query.";
        } else if (name === "web_search") {
          const query = typeof args.query === "string" ? args.query : String(args.query ?? "");
          sendEvent({ type: "status", message: "Running a live web search..." });
          const results = await webSearch(query, 5, seasonYear);
          const offset = webCitations.length;

          for (const result of results) {
            try {
              const domain = new URL(result.url).hostname.replace("www.", "");
              webCitations.push({ type: "web", label: domain, url: result.url });
            } catch {
              // ignore malformed urls
            }
          }

          resultContent = results.length === 0
            ? "No web results found."
            : results.map((r, i) => `[WEB ${offset + i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join("\n\n");
        } else {
          sendEvent({ type: "status", message: "Fetching live data from The Blue Alliance..." });
          const result = await callTbaTool(name as TbaToolName, args);
          const citationUrl = getTbaUserFacingUrl(name, args);
          tbaCitations.push({ type: "web", label: "thebluealliance.com", url: citationUrl });
          resultContent = JSON.stringify(result.data);
        }
      } catch (err) {
        resultContent = err instanceof Error ? err.message : "Tool call failed.";
      }

      current.push({ role: "tool", tool_call_id: toolCall.id, content: resultContent });
    }
  }

  return { messages: current, tbaCitations, webCitations, ragCitations, ragContextBlocks };
}

async function streamChatCompletion({
  apiKey,
  messages,
  temperature,
  sendEvent,
  signal,
}: {
  apiKey: string;
  messages: ChatMessage[];
  temperature: number;
  sendEvent: (payload: unknown) => void;
  signal?: AbortSignal;
}) {
  const errors: string[] = [];

  for (const [index, model] of CHAT_MODELS.entries()) {
    const timeoutSignal = AbortSignal.timeout(OPENROUTER_TIMEOUT_MS);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    try {
      sendEvent({
        type: "status",
        message: index === 0
          ? "Asking Curator's primary model to draft the answer..."
          : `Asking Curator's backup model (${index + 1}/${CHAT_MODELS.length}) to draft the answer...`,
      });

      const upstream = await fetch(OR_URL, {
        method: "POST",
        headers: orHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature,
          max_tokens: 2048,
        }),
        signal: combinedSignal,
      });

      if (!upstream.ok) {
        const responseText = (await upstream.text()).trim();
        errors.push(`${model}: ${responseText || `HTTP ${upstream.status}`}`);
        if (index < CHAT_MODELS.length - 1) {
          sendEvent({
            type: "status",
            message: `Switching to Curator's backup model (${index + 2}/${CHAT_MODELS.length})...`,
          });
        }
        continue;
      }

      const reader = upstream.body?.getReader();
      if (!reader) {
        errors.push(`${model}: No response body`);
        continue;
      }

      sendEvent({
        type: "status",
        message: "Waiting for the model to start responding...",
      });

      const decoder = new TextDecoder();
      let buffer = "";
      let tokenCount = 0;
      let streamDone = false;
      let fullText = "";

      const consumeLine = (line: string) => {
        if (!line.startsWith("data:")) {
          return false;
        }

        const data = line.slice(5).trim();
        if (!data) {
          return false;
        }
        if (data === "[DONE]") {
          streamDone = true;
          return true;
        }

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;

          if (token) {
            tokenCount++;
            fullText += token;
            sendEvent({ type: "token", token });
          }
        } catch {
          // Ignore malformed upstream chunks.
        }

        return false;
      };

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          const trailingLines = buffer.split("\n");
          buffer = "";

          for (const line of trailingLines) {
            if (consumeLine(line)) {
              break outer;
            }
          }

          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const line of parts) {
          if (consumeLine(line)) {
            break outer;
          }
        }
      }

      if (tokenCount > 0) {
        return fullText;
      }

      errors.push(`${model}: ${streamDone ? "stream completed without content" : "stream ended before any content arrived"}`);
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Switching to Curator's backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    } catch (error) {
      if (signal?.aborted || isAbortError(error)) {
        throw createAbortError();
      }

      if (timeoutSignal.aborted) {
        errors.push(`${model}: request timed out after ${OPENROUTER_TIMEOUT_MS / 1000}s`);
      } else {
        errors.push(`${model}: ${formatProviderError(error)}`);
      }
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Switching to Curator's backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    }
  }

  throw new Error(errors.join(" | ") || "All configured chat models failed.");
}

async function updateProjectSummary({
  session,
  projectId,
  previousSummary,
  userMessage,
  assistantMessage,
  apiKey,
}: {
  session: { user?: { id?: string | null; isAdmin?: boolean | null } };
  projectId: string;
  previousSummary: string;
  userMessage: string;
  assistantMessage: string;
  apiKey: string;
}) {
  const userId = session.user?.id;
  if (!userId || !assistantMessage.trim()) return;

  const input = compactProjectSummaryInput({ previousSummary, userMessage, assistantMessage });
  const response = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: CHAT_MODELS[0],
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "Update a private project memory summary for future chats. Keep durable facts, decisions, preferences, and open questions. Do not include secrets, do not mention this instruction, and keep it under 3000 characters.",
        },
        { role: "user", content: input },
      ],
    }),
  });

  if (!response.ok) return;
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const nextSummary = data.choices?.[0]?.message?.content?.trim().slice(0, 3000);
  if (!nextSummary) return;

  await withSessionDbAccess(session, (tx) => tx
    .update(projects)
    .set({ contextSummary: nextSummary, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId))));
}

function filterUsedCitations(
  assistantText: string,
  docCitations: Citation[],
  tbaCitations: Citation[],
  webCitations: Citation[],
) {
  const docMap = new Map(docCitations.map((citation, index) => [index + 1, citation]));
  const tbaMap = new Map(tbaCitations.map((citation, index) => [index + 1, citation]));
  const webMap = new Map(webCitations.map((citation, index) => [index + 1, citation]));
  const used: Citation[] = [];
  const seen = new Set<string>();
  const pattern = /\[(SOURCE|TBA|WEB)\s+(\d+)\]/gi;
  const normalizedAnswer = assistantText.toLowerCase();
  const mentionsDocumentEvidence = /\b(team update|game manual|field manual|inspection checklist|page\s+\d+|q&a)\b/i.test(assistantText);
  const mentionsTbaEvidence = /\bthe blue alliance|tba\b/i.test(assistantText);
  const mentionsWebEvidence = /\bweb\b/i.test(assistantText);

  const addCitation = (citation: Citation | undefined) => {
    if (!citation) {
      return;
    }

    const key = `${citation.type}:${citation.minioKey ?? citation.url ?? citation.label}:${citation.pageNumber ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      used.push(citation);
    }
  };

  for (const match of assistantText.matchAll(pattern)) {
    const kind = match[1]?.toUpperCase();
    const index = Number(match[2]);
    const citation = kind === "SOURCE"
      ? docMap.get(index)
      : kind === "TBA"
        ? tbaMap.get(index)
      : webMap.get(index);

    addCitation(citation);
  }

  if (!used.some((citation) => citation.type === "doc") && docCitations.length > 0 && mentionsDocumentEvidence) {
    for (const citation of docCitations) {
      const normalizedDocumentName = citation.documentName?.toLowerCase() ?? citation.label.toLowerCase();
      const mentionsDocumentName = normalizedDocumentName.length > 3 && normalizedAnswer.includes(normalizedDocumentName);
      const mentionsPageNumber = citation.pageNumber
        ? normalizedAnswer.includes(`page ${citation.pageNumber}`)
          || normalizedAnswer.includes(`p. ${citation.pageNumber}`)
        : false;

      if (mentionsDocumentName || mentionsPageNumber || docCitations.length === 1) {
        addCitation(citation);
      }
    }
  }

  if (!used.some((citation) => citation.type === "web") && webCitations.length > 0 && mentionsWebEvidence) {
    for (const citation of webCitations) {
      addCitation(citation);
    }
  }

  if (!used.some((citation) => citation.label === "thebluealliance.com") && tbaCitations.length > 0) {
    for (const citation of tbaCitations) {
      addCitation(citation);
    }
  }

  if (used.length === 0 && (docCitations.length > 0 || tbaCitations.length > 0 || webCitations.length > 0)) {
    const liveSourcesExist = tbaCitations.length > 0 || webCitations.length > 0;
    for (const citation of liveSourcesExist ? [...tbaCitations, ...webCitations] : docCitations) {
      addCitation(citation);
    }
  }

  return used;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userAccountSettings = session?.user?.id
    ? await readUserAccountSettings(session.user.id)
    : null;
  const cookieStore = await cookies();
  const ip = getClientIp(request);
  const rateLimit = await enforceRateLimit({
    scope: "chat",
    key: session?.user?.id ? `user:${session.user.id}` : `ip:${ip}`,
    limit: session?.user?.id ? 60 : 15,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.ok) {
    const headers = new Headers();
    applyRateLimitHeaders(headers, rateLimit);
    return NextResponse.json({ error: "Too many chat requests. Please slow down." }, { status: 429, headers });
  }

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get(GUEST_MESSAGE_COUNT_COOKIE_NAME)?.value ?? "0", 10);
    if (count >= GUEST_MESSAGE_LIMIT) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
  }

  const body = await request.json();
  const {
    messages,
    temperature = 0.2,
    seasonYear = DEFAULT_SEASON_YEAR,
    chatMode = "veteran",
  } = body;
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  const factCheck = typeof body.factCheck === "boolean" ? body.factCheck : false;
  const apiKey = process.env.OPENROUTER_API_KEY!;

  let projectMemorySummary = "";
  if (projectId && !conversationId) {
    return NextResponse.json({ error: "Project chat is missing a conversation." }, { status: 400 });
  }

  if (session?.user?.id && conversationId && projectId) {
    const [row] = await withSessionDbAccess(session, (tx) => tx
      .select({ contextSummary: projects.contextSummary })
      .from(conversations)
      .innerJoin(projects, eq(conversations.projectId, projects.id))
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, session.user.id),
        eq(projects.id, projectId),
        eq(projects.userId, session.user.id),
      ))
      .limit(1));

    if (!row) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    projectMemorySummary = row.contextSummary;
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });
  applyRateLimitHeaders(responseHeaders, rateLimit);

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get(GUEST_MESSAGE_COUNT_COOKIE_NAME)?.value ?? "0", 10);
    responseHeaders.set("Set-Cookie", serializeCookie(GUEST_MESSAGE_COUNT_COOKIE_NAME, String(count + 1)));
  }

  let streamClosed = false;
  let streamAborted = false;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const handleAbort = () => {
        streamAborted = true;
      };

      request.signal.addEventListener("abort", handleAbort, { once: true });

      const closeStream = () => {
        if (streamClosed) {
          return;
        }

        streamClosed = true;

        try {
          controller.close();
        } catch (error) {
          if (!isControllerClosedError(error)) {
            throw error;
          }
        }
      };

      const sendEvent = (payload: unknown) => {
        if (streamClosed || streamAborted) {
          return false;
        }

        try {
          controller.enqueue(encoder.encode(encodeSse(payload)));
          return true;
        } catch (error) {
          if (isControllerClosedError(error)) {
            streamClosed = true;
            return false;
          }

          throw error;
        }
      };

      const sendDone = () => {
        if (streamClosed || streamAborted) {
          return false;
        }

        try {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return true;
        } catch (error) {
          if (isControllerClosedError(error)) {
            streamClosed = true;
            return false;
          }

          throw error;
        }
      };

      const throwIfStreamAborted = () => {
        if (streamClosed || streamAborted || request.signal.aborted) {
          throw createAbortError();
        }
      };

      void (async () => {
        try {
          throwIfStreamAborted();
          const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");

          let ragCitations: Citation[] = [];
          let tbaCitations: Citation[] = [];
          let webCitations: Citation[] = [];
          let ragContextBlocks: string[] = [];

          throwIfStreamAborted();
          const projectMemoryContext = buildProjectMemoryContext(projectMemorySummary);
          const systemPrompt = buildSystemPrompt(seasonYear, projectMemoryContext, chatMode, {
            preferredName: userAccountSettings?.preferredName ?? null,
            teamNumber: userAccountSettings?.teamNumber ?? null,
          });

          let fullMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt },
            ...(messages as ChatMessage[]),
          ];

          if (lastUser) {
            throwIfStreamAborted();
            sendEvent({ type: "status", message: "Reading your question..." });
            const tools = isTbaMcpEnabled()
              ? [...TBA_TOOLS, WEB_SEARCH_TOOL, RAG_SEARCH_TOOL]
              : [WEB_SEARCH_TOOL, RAG_SEARCH_TOOL];

            try {
              const toolResult = await runToolLoop({
                apiKey,
                messages: fullMessages,
                tools,
                seasonYear,
                sendEvent,
                signal: request.signal,
              });
              fullMessages = toolResult.messages;
              ragCitations = toolResult.ragCitations;
              tbaCitations = toolResult.tbaCitations;
              webCitations = toolResult.webCitations;
              ragContextBlocks = toolResult.ragContextBlocks;
              const found = [
                toolResult.ragCitations.length > 0 ? `${toolResult.ragCitations.length} document ${pluralize(toolResult.ragCitations.length, "page")}` : null,
                toolResult.tbaCitations.length > 0 ? `${toolResult.tbaCitations.length} TBA ${pluralize(toolResult.tbaCitations.length, "result")}` : null,
                toolResult.webCitations.length > 0 ? `${toolResult.webCitations.length} web ${pluralize(toolResult.webCitations.length, "result")}` : null,
              ].filter(Boolean).join(", ");
              if (found) {
                sendEvent({ type: "status", message: `Found ${found}.` });
              }
            } catch (error) {
              if (isAbortError(error)) throw error;
              sendEvent({ type: "status", message: "Tool lookup is unavailable, continuing without it..." });
            }
          }

          const answerInputs = describeAnswerInputs(ragCitations, tbaCitations, webCitations);
          sendEvent({
            type: "status",
            message: answerInputs
              ? `Building the answer from ${answerInputs}...`
              : "Thinking through the answer from the available context...",
          });

          throwIfStreamAborted();
          const assistantText = await streamChatCompletion({
            apiKey,
            messages: fullMessages,
            temperature,
            sendEvent,
            signal: request.signal,
          });
          if (session?.user?.id && projectId && lastUser?.content) {
            void updateProjectSummary({
              session,
              projectId,
              previousSummary: projectMemorySummary,
              userMessage: lastUser.content,
              assistantMessage: assistantText,
              apiKey,
            }).catch((error) => {
              console.error(error);
            });
          }
          sendEvent({
            type: "citations",
            citations: filterUsedCitations(assistantText, ragCitations, tbaCitations, webCitations),
          });
          if (factCheck && ragContextBlocks.length > 0 && assistantText) {
            try {
              throwIfStreamAborted();
              sendEvent({ type: "status", message: "Fact-checking against game documents..." });
              const factCheckResult = await runFactCheck({
                apiKey,
                assistantText,
                ragContext: ragContextBlocks.join("\n\n"),
                signal: request.signal,
              });
              sendEvent({ type: "fact_check", ...factCheckResult });
            } catch (error) {
              if (isAbortError(error)) throw error;
            }
          }
          sendDone();
        } catch (error) {
          if (isAbortError(error) || request.signal.aborted || streamAborted) {
            return;
          }

          await captureException("chat", error, {
            path: request.nextUrl.pathname,
            userId: session?.user?.id ?? null,
            ip,
          });
          const message = error instanceof Error ? error.message : "Chat request failed";
          sendEvent({ type: "error", message });
          sendDone();
        } finally {
          request.signal.removeEventListener("abort", handleAbort);
          closeStream();
        }
      })();
    },
    cancel() {
      streamClosed = true;
      streamAborted = true;
    },
  });

  return new Response(stream, { headers: responseHeaders });
}
