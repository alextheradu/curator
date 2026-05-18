import type { Citation } from "@/lib/db/schema";
import { isUuid } from "@/lib/uuid";

export type PersistedMessageInput = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type ParseResult =
  | { ok: true; value: PersistedMessageInput }
  | { ok: false; error: string };

const MAX_MESSAGE_CONTENT_CHARS = 30_000;
const MAX_CITATIONS = 20;
const MAX_CITATION_LABEL_CHARS = 160;
const MAX_CITATION_QUOTE_CHARS = 800;
const MAX_MINIO_KEY_CHARS = 500;

function boundedString(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSafeInternalDocumentUrl(value: string) {
  try {
    const url = new URL(value, "https://curator.local");
    return url.origin === "https://curator.local"
      && url.pathname === "/api/documents/view"
      && Boolean(url.searchParams.get("key"));
  } catch {
    return false;
  }
}

export function sanitizeCitation(value: unknown): Citation | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const type = input.type === "doc" || input.type === "web" ? input.type : null;
  if (!type) return null;

  const label = boundedString(input.label, MAX_CITATION_LABEL_CHARS);
  if (!label) return null;

  const citation: Citation = { type, label };
  const documentName = boundedString(input.documentName, MAX_CITATION_LABEL_CHARS);
  const quote = boundedString(input.quote, MAX_CITATION_QUOTE_CHARS);
  const pageNumber = typeof input.pageNumber === "number" && Number.isFinite(input.pageNumber) && input.pageNumber > 0
    ? Math.trunc(input.pageNumber)
    : undefined;

  if (documentName) citation.documentName = documentName;
  if (quote) citation.quote = quote;
  if (pageNumber) citation.pageNumber = pageNumber;

  if (type === "web") {
    const url = boundedString(input.url, 2048);
    if (!url || !isSafeHttpUrl(url)) return null;
    citation.url = url;
    return citation;
  }

  const minioKey = boundedString(input.minioKey, MAX_MINIO_KEY_CHARS);
  if (minioKey) {
    citation.minioKey = minioKey;
    return citation;
  }

  const url = boundedString(input.url, 2048);
  if (!url || !isSafeInternalDocumentUrl(url)) return null;
  citation.url = url.startsWith("/") ? url : `${new URL(url, "https://curator.local").pathname}${new URL(url, "https://curator.local").search}`;
  return citation;
}

export function sanitizeCitations(value: unknown): Citation[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const citations = value
    .slice(0, MAX_CITATIONS)
    .map(sanitizeCitation)
    .filter((citation): citation is Citation => citation !== null);

  return citations.length > 0 ? citations : undefined;
}

export function parsePersistedMessageInput(value: unknown): ParseResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Invalid message body" };
  }

  const input = value as Record<string, unknown>;
  if (input.role !== "user" && input.role !== "assistant") {
    return { ok: false, error: "role must be user or assistant" };
  }

  if (typeof input.content !== "string" || input.content.trim().length === 0) {
    return { ok: false, error: "content is required" };
  }

  if (input.content.length > MAX_MESSAGE_CONTENT_CHARS) {
    return { ok: false, error: `content must be ${MAX_MESSAGE_CONTENT_CHARS} characters or fewer` };
  }

  if (input.id !== undefined && (typeof input.id !== "string" || !isUuid(input.id))) {
    return { ok: false, error: "id must be a valid UUID" };
  }

  return {
    ok: true,
    value: {
      ...(typeof input.id === "string" ? { id: input.id } : {}),
      role: input.role,
      content: input.content,
      ...(Array.isArray(input.citations) ? { citations: sanitizeCitations(input.citations) } : {}),
    },
  };
}
