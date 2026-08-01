import type { ConversationRecord, MessageRecord } from "@/lib/conversations";
import type { ProjectRecord } from "@/lib/projects";

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

export async function fetchProjects() {
  const response = await fetch("/api/projects", { cache: "no-store" });
  return readJson<ProjectRecord[]>(response);
}

export async function createProject(payload: { name: string; icon: string; color: string }) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson<ProjectRecord>(response);
}

export async function updateProject(id: string, payload: { name: string; icon: string; color: string }) {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson<ProjectRecord>(response);
}

export async function deleteProject(id: string) {
  const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  return readJson<{ ok: true }>(response);
}

export async function createConversation(payload?: { title?: string; seasonYear?: number; projectId?: string | null }) {
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
  payload: Partial<Pick<ConversationRecord, "title" | "seasonYear" | "isPublic" | "projectId">>
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

export type DeletedConversationRecord = ConversationRecord & { deletedAt: string | Date };

export async function fetchDeletedConversations() {
  const response = await fetch("/api/conversations?deleted=true", { cache: "no-store" });
  return readJson<DeletedConversationRecord[]>(response);
}

export async function restoreConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}`, { method: "POST" });
  return readJson<ConversationRecord>(response);
}

export async function permanentlyDeleteConversation(id: string) {
  const response = await fetch(`/api/conversations/${id}?permanent=true`, { method: "DELETE" });
  return readJson<{ ok: true }>(response);
}

export async function createConversationMessage(
  id: string,
  payload: {
    id?: string;
    role: "user";
    content: string;
  }
) {
  const response = await fetch(`/api/conversations/${id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readJson<MessageRecord>(response);
}

export async function claimGuestConversations(): Promise<string[]> {
  const response = await fetch("/api/conversations/claim", { method: "POST" });
  if (!response.ok) return [];
  const data = await response.json() as { conversationIds?: string[] };
  return data.conversationIds ?? [];
}
