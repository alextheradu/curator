import type { Citation } from "@/lib/db/schema";

interface StreamOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  seasonYear?: number;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone: (citations: Citation[]) => void;
  onError: (err: Error) => void;
  onAuthRequired?: () => void;
}

export async function streamOpenRouterChat({
  messages, temperature = 0.2, seasonYear, signal,
  onToken, onDone, onError, onAuthRequired,
}: StreamOptions) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature, seasonYear }),
      signal,
    });

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data.error === "auth_required") { onAuthRequired?.(); return; }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(data.error ?? `HTTP ${response.status}`);
    }

    const citations: Citation[] = JSON.parse(response.headers.get("X-Citations") ?? "[]");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(citations); return; }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch { /* skip malformed chunks */ }
      }
    }
    onDone(citations);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
