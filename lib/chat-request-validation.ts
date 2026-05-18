export type ClientChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ParseResult =
  | { ok: true; value: ClientChatMessage[] }
  | { ok: false; error: string };

const MAX_CHAT_HISTORY_MESSAGES = 40;
const MAX_CHAT_MESSAGE_CHARS = 20_000;

export function parseClientChatMessages(value: unknown): ParseResult {
  if (!Array.isArray(value)) {
    return { ok: false, error: "messages must be an array" };
  }

  if (value.length === 0) {
    return { ok: false, error: "messages must include at least one message" };
  }

  if (value.length > MAX_CHAT_HISTORY_MESSAGES) {
    return { ok: false, error: `messages must include ${MAX_CHAT_HISTORY_MESSAGES} messages or fewer` };
  }

  const messages: ClientChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "messages must contain objects" };
    }

    const input = item as Record<string, unknown>;
    if (input.role !== "user" && input.role !== "assistant") {
      return { ok: false, error: "messages contains an unsupported role" };
    }

    if (typeof input.content !== "string" || input.content.trim().length === 0) {
      return { ok: false, error: "messages must contain non-empty content" };
    }

    if (input.content.length > MAX_CHAT_MESSAGE_CHARS) {
      return { ok: false, error: `message content must be ${MAX_CHAT_MESSAGE_CHARS} characters or fewer` };
    }

    if (
      "tool_calls" in input
      || "tool_call_id" in input
      || "name" in input
      || "function_call" in input
    ) {
      return { ok: false, error: "messages contains unsupported tool fields" };
    }

    messages.push({
      role: input.role,
      content: input.content,
    });
  }

  return { ok: true, value: messages };
}
