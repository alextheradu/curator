import type { Citation } from "@/lib/db/schema";
import type { ConversationRecord, MessageRecord } from "@/lib/conversations";

type ConversationAccess = "owner" | "public";

type ConversationResponse = {
  conversation: ConversationRecord;
  access: ConversationAccess;
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchConversationList() {
  const response = await fetch("/api/conversations", { cache: "no-store" });
  return readJson<ConversationRecord[]>(response);
}

export async function createConversation(payload?: { title?: string; seasonYear?: number }) {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });

  return readJson<ConversationRecord>(response);
}

export async function fetchConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
  if (response.status === 404) return null;
  return readJson<ConversationResponse>(response);
}

export async function fetchConversationMessages(id: string) {
  const response = await fetch(`/api/conversations/${id}/messages`, { cache: "no-store" });
  if (response.status === 404) return null;
  return readJson<MessageRecord[]>(response);
}

export async function updateConversation(
  id: string,
  payload: Partial<Pick<ConversationRecord, "title" | "seasonYear" | "isPublic">>
) {
  const response = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson<ConversationRecord>(response);
}

export async function deleteConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  return readJson<{ ok: true }>(response);
}

export async function createConversationMessage(
  id: string,
  payload: {
    role: "user" | "assistant";
    content: string;
    citations?: Citation[];
  }
) {
  const response = await fetch(`/api/conversations/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson<MessageRecord>(response);
}
