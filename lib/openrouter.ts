import type { Citation } from "@/lib/db/schema";
import type { SearchActivity, SearchMode } from "@/lib/search-activity";

interface StreamOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  seasonYear?: number;
  chatMode?: "rookie" | "veteran";
  conversationId?: string;
  projectId?: string | null;
  assistantMessageId?: string;
  factCheck?: boolean;
  deepSearch?: boolean;
  searchMode?: SearchMode;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onStatus?: (status: string) => void;
  onSearchActivity?: (activity: SearchActivity) => void;
  onDone: (citations: Citation[], factCheck?: { accurate: boolean; note: string }, searchActivity?: SearchActivity) => void;
  onError: (err: Error) => void;
  onAuthRequired?: () => void;
}

const STALL_TIMEOUT_MS = 30_000;

export async function streamOpenRouterChat({
  messages, temperature = 0.2, seasonYear, chatMode = "veteran", conversationId, projectId, assistantMessageId, factCheck, deepSearch, searchMode,
  signal, onToken, onStatus, onSearchActivity, onDone, onError, onAuthRequired,
}: StreamOptions) {
  // A stalled connection (dropped mid-stream, hung request) otherwise never
  // rejects on its own - fetch/reader.read() just wait forever with no
  // error ever reaching onError. This watchdog aborts if no bytes arrive
  // for STALL_TIMEOUT_MS, reset on every chunk received.
  const internalController = new AbortController();
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  let stalled = false;

  const armStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      internalController.abort();
    }, STALL_TIMEOUT_MS);
  };

  const onExternalAbort = () => internalController.abort();
  signal?.addEventListener("abort", onExternalAbort);

  try {
    armStallTimer();
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature, seasonYear, chatMode, conversationId, projectId, assistantMessageId, factCheck, deepSearch, searchMode }),
      signal: internalController.signal,
    });

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data.error === "auth_required") { onAuthRequired?.(); return; }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(data.error ?? `HTTP ${response.status}`);
    }

    let citations: Citation[] = [];
    let pendingFactCheck: { accurate: boolean; note: string } | undefined;
    let pendingSearchActivity: SearchActivity | undefined;
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      armStallTimer();
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(citations, pendingFactCheck, pendingSearchActivity); return; }
        let parsed: {
          type?: string;
          message?: string;
          citations?: Citation[];
          token?: string;
          accurate?: boolean;
          note?: string;
          activity?: SearchActivity;
          choices?: Array<{ delta?: { content?: string } }>;
        };
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }

        if (parsed.type === "status") {
          onStatus?.(parsed.message ?? "");
          continue;
        }
        if (parsed.type === "citations") {
          citations = parsed.citations ?? [];
          continue;
        }
        if (parsed.type === "fact_check") {
          pendingFactCheck = { accurate: Boolean(parsed.accurate), note: String(parsed.note ?? "") };
          continue;
        }
        if (parsed.type === "search_activity") {
          pendingSearchActivity = parsed.activity;
          if (pendingSearchActivity) {
            onSearchActivity?.(pendingSearchActivity);
          }
          continue;
        }
        if (parsed.type === "error") {
          throw new Error(parsed.message ?? "Failed to reach OpenRouter.");
        }

        const token = parsed.type === "token"
          ? parsed.token
          : parsed.choices?.[0]?.delta?.content;
        if (token) {
          onStatus?.("");
          onToken(token);
        }
      }
    }
    clearTimeout(stallTimer);
    onStatus?.("");
    onDone(citations, pendingFactCheck, pendingSearchActivity);
  } catch (err: unknown) {
    clearTimeout(stallTimer);
    if (err instanceof Error && err.name === "AbortError") {
      if (stalled) {
        onStatus?.("");
        onError(new Error("The response stalled. Please try again."));
      }
      return;
    }
    onStatus?.("");
    onError(err instanceof Error ? err : new Error(String(err)));
  } finally {
    signal?.removeEventListener("abort", onExternalAbort);
  }
}
