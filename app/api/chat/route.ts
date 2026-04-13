import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { messages, temperature = 0.2 } = await request.json();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openRouterResponse = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Curator FRC Assistant",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages,
        stream: true,
        temperature,
        top_p: 0.9,
        max_tokens: 2048,
      }),
    }
  );

  if (!openRouterResponse.ok) {
    const errorText = await openRouterResponse.text();
    let errorMessage = `OpenRouter error ${openRouterResponse.status}`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message ?? errorMessage;
    } catch {}
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: openRouterResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(openRouterResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
