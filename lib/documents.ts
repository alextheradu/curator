import type { DocumentScope } from "@/lib/db/schema";

export const DOCUMENT_SCOPE_LABELS: Record<DocumentScope, string> = {
  season: "Season",
  general: "General",
};

export function normalizeDocumentScope(value: FormDataEntryValue | string | null | undefined): DocumentScope {
  return value === "general" ? "general" : "season";
}

export function getDocumentScopeLabel(scope: DocumentScope, seasonYear?: number | null) {
  if (scope === "general") {
    return DOCUMENT_SCOPE_LABELS.general;
  }

  return seasonYear ? String(seasonYear) : DOCUMENT_SCOPE_LABELS.season;
}
