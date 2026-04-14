import { auth } from "@/auth";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import { buildRagContext } from "@/lib/rag";
import { webSearch } from "@/lib/langsearch";
import type { Citation } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GUEST_LIMIT = 3;
const MODEL = "openai/gpt-oss-120b:free";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_web",
    description: "Search the web for current FRC news, team info, event results, or anything not in uploaded docs.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
};

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

function shouldRunWebSearch(query: string, ragHitCount: number) {
  const normalized = query.toLowerCase();
  const hinted = WEB_SEARCH_HINTS.some((hint) => normalized.includes(hint));

  if (hinted) return true;
  return ragHitCount === 0 && /team\s+\d+|district|regional|championship|match/i.test(query);
}

function orHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Curator FRC Assistant",
  };
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

  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const { contextBlock, citations: ragCitations } = lastUser
    ? await buildRagContext(lastUser.content)
    : { contextBlock: "", citations: [] };

  const systemPrompt = buildSystemPrompt(seasonYear, contextBlock);
  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const allCitations: Citation[] = [...ragCitations];

  let finalMessages = fullMessages;
  if (lastUser && shouldRunWebSearch(lastUser.content, ragCitations.length)) {
    try {
      const first = await fetch(OR_URL, {
        method: "POST",
        headers: orHeaders(apiKey),
        body: JSON.stringify({
          model: MODEL,
          messages: fullMessages,
          tools: [SEARCH_TOOL],
          tool_choice: "auto",
          stream: false,
          temperature,
          max_tokens: 1024,
        }),
      });

      if (first.ok) {
        const firstData = await first.json();
        const firstChoice = firstData.choices?.[0];

        if (firstChoice?.finish_reason === "tool_calls" && firstChoice?.message?.tool_calls) {
          const toolCall = firstChoice.message.tool_calls[0];
          const { query } = JSON.parse(toolCall.function.arguments);
          const webResults = await webSearch(query);

          for (const r of webResults) {
            try {
              const domain = new URL(r.url).hostname.replace("www.", "");
              allCitations.push({ type: "web", label: domain, url: r.url });
            } catch { /* invalid URL */ }
          }

          const toolContent = webResults.length > 0
            ? webResults.map((r, i) => `[WEB ${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join("\n\n")
            : "No results found.";

          finalMessages = [
            ...fullMessages,
            firstChoice.message,
            { role: "tool", tool_call_id: toolCall.id, content: toolContent },
          ];
        }
      }
    } catch {
      // Network error on tool pass — fall through to plain streaming
    }
  }

  const stream = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: MODEL,
      messages: finalMessages,
      stream: true,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!stream.ok) {
    const errText = await stream.text();
    return NextResponse.json({ error: errText }, { status: stream.status });
  }

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "X-Citations": JSON.stringify(allCitations),
  });

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get("guest_message_count")?.value ?? "0", 10);
    responseHeaders.set("Set-Cookie", `guest_message_count=${count + 1}; Path=/; SameSite=Lax`);
  }

  return new Response(stream.body, { headers: responseHeaders });
}
