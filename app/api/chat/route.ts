import { auth } from "@/auth";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import { buildRagContext } from "@/lib/rag";
import { buildWebContext, webSearch } from "@/lib/langsearch";
import { DEFAULT_SEASON_YEAR } from "@/lib/seasons";
import { shouldRunWebSearch } from "@/lib/web-search-decision";
import type { Citation } from "@/lib/db/schema";
import { GUEST_MESSAGE_COUNT_COOKIE_NAME, GUEST_MESSAGE_LIMIT } from "@/lib/app-cookies";
import { serializeCookie } from "@/lib/cookies";
import { captureException } from "@/lib/logging";
import { applyRateLimitHeaders, enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-context";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

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
  webCitations: Citation[],
) {
  const parts: string[] = [];

  if (ragCitations.length > 0) {
    parts.push(`${ragCitations.length} document ${pluralize(ragCitations.length, "page")}`);
  }

  if (webCitations.length > 0) {
    parts.push(`${webCitations.length} web ${pluralize(webCitations.length, "result")}`);
  }

  return parts.length > 0 ? joinNaturalList(parts) : "";
}

async function streamChatCompletion({
  apiKey,
  messages,
  temperature,
  sendEvent,
  signal,
}: {
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  sendEvent: (payload: unknown) => void;
  signal?: AbortSignal;
}) {
  const errors: string[] = [];

  for (const [index, model] of CHAT_MODELS.entries()) {
    try {
      sendEvent({
        type: "status",
        message: index === 0
          ? "Asking Curator's primary model to draft the answer..."
          : `Asking Curator's backup model (${index + 1}/${CHAT_MODELS.length}) to draft the answer...`,
      });

      const timeoutSignal = AbortSignal.timeout(OPENROUTER_TIMEOUT_MS);
      const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

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
        errors.push(`${model}: ${await upstream.text()}`);
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

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const line of parts) {
          if (!line.startsWith("data:")) {
            continue;
          }

          const data = line.slice(5).trim();
          if (!data) {
            continue;
          }
          if (data === "[DONE]") {
            streamDone = true;
            break outer;
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
        }
      }

      if (streamDone && tokenCount > 0) {
        return fullText;
      }

      errors.push(`${model}: stream ended with no content`);
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Switching to Curator's backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Switching to Curator's backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    }
  }

  throw new Error(errors.join(" | "));
}

function filterUsedCitations(
  assistantText: string,
  docCitations: Citation[],
  webCitations: Citation[],
) {
  const docMap = new Map(docCitations.map((citation, index) => [index + 1, citation]));
  const webMap = new Map(webCitations.map((citation, index) => [index + 1, citation]));
  const used: Citation[] = [];
  const seen = new Set<string>();
  const pattern = /\[(SOURCE|WEB)\s+(\d+)\]/gi;

  for (const match of assistantText.matchAll(pattern)) {
    const kind = match[1]?.toUpperCase();
    const index = Number(match[2]);
    const citation = kind === "SOURCE"
      ? docMap.get(index)
      : webMap.get(index);

    if (!citation) {
      continue;
    }

    const key = `${citation.type}:${citation.minioKey ?? citation.url ?? citation.label}:${citation.pageNumber ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      used.push(citation);
    }
  }

  return used;
}

export async function POST(request: NextRequest) {
  const session = await auth();
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

  const { messages, temperature = 0.2, seasonYear = DEFAULT_SEASON_YEAR, chatMode = "veteran" } = await request.json();
  const apiKey = process.env.OPENROUTER_API_KEY!;

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

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (payload: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(payload)));
      };

      const sendDone = () => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      };

      void (async () => {
        try {
          const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");

          let contextBlock = "";
          let effectiveSeasonYear = seasonYear;
          let ragHitCount = 0;
          let ragBestScore = 0;
          let ragCitations: Citation[] = [];
          const webCitations: Citation[] = [];

          if (lastUser) {
            sendEvent({ type: "status", message: "Reading your question..." });
            sendEvent({ type: "status", message: "Checking uploaded documents and indexed manuals..." });

            try {
              const ragContext = await buildRagContext(lastUser.content, seasonYear, {
                onStatus: (message) => sendEvent({ type: "status", message }),
              });
              contextBlock += ragContext.contextBlock;
              ragCitations = ragContext.citations;
              ragHitCount = ragContext.hitCount;
              ragBestScore = ragContext.bestScore;
              effectiveSeasonYear = ragContext.selectedSeasonYear ?? seasonYear;
              sendEvent({
                type: "status",
                message: ragHitCount > 0
                  ? `Found ${ragHitCount} relevant document ${pluralize(ragHitCount, "page")} in the indexed files.`
                  : "No strong document match yet, continuing to live sources...",
              });
            } catch {
              sendEvent({ type: "status", message: "Document search is unavailable, continuing without it..." });
            }
          }

          if (lastUser && shouldRunWebSearch(lastUser.content, ragHitCount, ragBestScore)) {
            sendEvent({ type: "status", message: "Checking whether a live web search is needed..." });

            try {
              const webResults = await webSearch(lastUser.content, 5, effectiveSeasonYear, {
                onStatus: (message) => sendEvent({ type: "status", message }),
              });
              contextBlock += buildWebContext(webResults);

              for (const result of webResults) {
                try {
                  const domain = new URL(result.url).hostname.replace("www.", "");
                  webCitations.push({ type: "web", label: domain, url: result.url });
                } catch {
                  // Ignore malformed URLs from providers.
                }
              }
              if (webResults.length > 0) {
                sendEvent({
                  type: "status",
                  message: `Found ${webResults.length} live web ${pluralize(webResults.length, "result")}.`,
                });
              }
            } catch {
              sendEvent({ type: "status", message: "Web search is unavailable, continuing without it..." });
            }
          }

          const answerInputs = describeAnswerInputs(ragCitations, webCitations);
          sendEvent({
            type: "status",
            message: answerInputs
              ? `Building the answer from ${answerInputs}...`
              : "Thinking through the answer from the available context...",
          });

          const systemPrompt = buildSystemPrompt(effectiveSeasonYear, contextBlock, chatMode);
          const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
          const assistantText = await streamChatCompletion({
            apiKey,
            messages: fullMessages,
            temperature,
            sendEvent,
            signal: request.signal,
          });
          sendEvent({
            type: "citations",
            citations: filterUsedCitations(assistantText, ragCitations, webCitations),
          });
          sendDone();
          controller.close();
        } catch (error) {
          await captureException("chat", error, {
            path: request.nextUrl.pathname,
            userId: session?.user?.id ?? null,
            ip,
          });
          const message = error instanceof Error ? error.message : "Chat request failed";
          sendEvent({ type: "error", message });
          sendDone();
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, { headers: responseHeaders });
}
