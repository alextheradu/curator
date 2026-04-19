import { auth } from "@/auth";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import { buildRagContext } from "@/lib/rag";
import { buildWebContext, webSearch } from "@/lib/langsearch";
import type { Citation } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GUEST_LIMIT = 3;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const CHAT_MODELS = (
  process.env.OPENROUTER_CHAT_MODELS
  ?? "openai/gpt-oss-120b:free,openai/gpt-4o-mini"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const WEB_SEARCH_HINTS = [
  "latest",
  "recent",
  "current",
  "today",
  "yesterday",
  "this week",
  "this month",
  "news",
  "update",
  "updates",
  "event",
  "events",
  "results",
  "ranking",
  "rankings",
  "standing",
  "standings",
  "who won",
  "look up",
  "search the web",
  "online",
];

function shouldRunWebSearch(query: string, ragHitCount: number, bestScore: number) {
  const normalized = query.toLowerCase();
  const hinted = WEB_SEARCH_HINTS.some((hint) => normalized.includes(hint));

  if (hinted) return true;
  if (ragHitCount === 0) return true;
  return bestScore < 0.25 && /team\s+\d+|district|regional|championship|match/i.test(query);
}

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

async function streamChatCompletion({
  apiKey,
  messages,
  temperature,
  sendEvent,
  sendDone,
  controller,
  signal,
}: {
  apiKey: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  sendEvent: (payload: unknown) => void;
  sendDone: () => void;
  controller: ReadableStreamDefaultController<Uint8Array>;
  signal?: AbortSignal;
}) {
  const errors: string[] = [];

  for (const [index, model] of CHAT_MODELS.entries()) {
    try {
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
            message: `Retrying with backup model (${index + 2}/${CHAT_MODELS.length})...`,
          });
        }
        continue;
      }

      const reader = upstream.body?.getReader();
      if (!reader) {
        errors.push(`${model}: No response body`);
        continue;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let tokenCount = 0;
      let streamDone = false;

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
              sendEvent({ type: "token", token });
            }
          } catch {
            // Ignore malformed upstream chunks.
          }
        }
      }

      if (streamDone && tokenCount > 0) {
        sendDone();
        controller.close();
        return;
      }

      errors.push(`${model}: stream ended with no content`);
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Retrying with backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
      if (index < CHAT_MODELS.length - 1) {
        sendEvent({
          type: "status",
          message: `Retrying with backup model (${index + 2}/${CHAT_MODELS.length})...`,
        });
      }
    }
  }

  throw new Error(errors.join(" | "));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const cookieStore = await cookies();

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get("guest_message_count")?.value ?? "0", 10);
    if (count >= GUEST_LIMIT) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
  }

  const { messages, temperature = 0.2, seasonYear = 2026 } = await request.json();
  const apiKey = process.env.OPENROUTER_API_KEY!;

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  });

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get("guest_message_count")?.value ?? "0", 10);
    responseHeaders.set("Set-Cookie", `guest_message_count=${count + 1}; Path=/; SameSite=Lax`);
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
          const allCitations: Citation[] = [];

          if (lastUser) {
            sendEvent({ type: "status", message: "Searching files..." });

            try {
              const ragContext = await buildRagContext(lastUser.content, seasonYear);
              contextBlock += ragContext.contextBlock;
              allCitations.push(...ragContext.citations);
              ragHitCount = ragContext.hitCount;
              ragBestScore = ragContext.bestScore;
              effectiveSeasonYear = ragContext.selectedSeasonYear ?? seasonYear;
            } catch {
              sendEvent({ type: "status", message: "File search unavailable, continuing without it..." });
            }
          }

          if (lastUser && shouldRunWebSearch(lastUser.content, ragHitCount, ragBestScore)) {
            sendEvent({ type: "status", message: "Searching the web..." });

            try {
              const webResults = await webSearch(lastUser.content, 5);
              contextBlock += buildWebContext(webResults);

              for (const result of webResults) {
                try {
                  const domain = new URL(result.url).hostname.replace("www.", "");
                  allCitations.push({ type: "web", label: domain, url: result.url });
                } catch {
                  // Ignore malformed URLs from providers.
                }
              }
            } catch {
              sendEvent({ type: "status", message: "Web search unavailable, continuing without it..." });
            }
          }

          sendEvent({ type: "citations", citations: allCitations });
          sendEvent({ type: "status", message: "Writing answer..." });

          const systemPrompt = buildSystemPrompt(effectiveSeasonYear, contextBlock);
          const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
          await streamChatCompletion({
            apiKey,
            messages: fullMessages,
            temperature,
            sendEvent,
            sendDone,
            controller,
            signal: request.signal,
          });
        } catch (error) {
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
