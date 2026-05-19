import type { SearchMode } from "@/lib/search-activity";

export type ChatSearchOptions = {
  searchMode: SearchMode;
  factCheck: boolean;
};

export type DeepSearchConfig = {
  maxIterations: number;
  maxToolDurationMs: number;
  documentLimit: number;
  webResultsPerCall: number;
};

const FAST_DOCUMENT_LIMIT = 6;
const FAST_DOCUMENT_LIMIT_MAX = 20;
const FAST_SEARCH_MAX_ITERATIONS = 3;
const FAST_SEARCH_MAX_TOOL_DURATION_MS = 15_000;
const BALANCED_DOCUMENT_LIMIT = 8;
const BALANCED_SEARCH_MAX_ITERATIONS = 4;
const BALANCED_SEARCH_MAX_TOOL_DURATION_MS = 30_000;
const BALANCED_WEB_RESULTS_PER_CALL = 4;
const DEEP_DOCUMENT_LIMIT = 12;
const DEEP_DOCUMENT_LIMIT_MAX = 50;
const DEEP_SEARCH_MAX_ITERATIONS = 12;
const DEEP_SEARCH_MAX_TOOL_DURATION_MS = 90_000;
const DEEP_WEB_RESULTS_PER_CALL = 8;

function parseSearchMode(value: unknown): SearchMode | null {
  return value === "fast" || value === "balanced" || value === "deep" ? value : null;
}

export function parseChatSearchOptions(body: unknown): ChatSearchOptions {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const searchMode = parseSearchMode(input.searchMode) ?? (input.deepSearch === true ? "deep" : "fast");

  return {
    searchMode,
    factCheck: input.factCheck === true,
  };
}

export function clampDocumentSearchLimit(limit: unknown, searchMode: SearchMode | boolean) {
  const normalizedMode: SearchMode = typeof searchMode === "boolean"
    ? (searchMode ? "deep" : "fast")
    : searchMode;
  const fallback = normalizedMode === "deep"
    ? DEEP_DOCUMENT_LIMIT
    : normalizedMode === "balanced"
      ? BALANCED_DOCUMENT_LIMIT
      : FAST_DOCUMENT_LIMIT;
  const max = normalizedMode === "deep" ? DEEP_DOCUMENT_LIMIT_MAX : FAST_DOCUMENT_LIMIT_MAX;
  const numericLimit = typeof limit === "number" && Number.isFinite(limit) ? limit : fallback;

  return Math.min(Math.max(Math.trunc(numericLimit), 1), max);
}

export function buildDeepSearchConfig(searchMode: SearchMode | boolean): DeepSearchConfig {
  const normalizedMode: SearchMode = typeof searchMode === "boolean"
    ? (searchMode ? "deep" : "fast")
    : searchMode;

  if (normalizedMode === "fast") {
    return {
      maxIterations: FAST_SEARCH_MAX_ITERATIONS,
      maxToolDurationMs: FAST_SEARCH_MAX_TOOL_DURATION_MS,
      documentLimit: FAST_DOCUMENT_LIMIT,
      webResultsPerCall: 0,
    };
  }

  if (normalizedMode === "balanced") {
    return {
      maxIterations: BALANCED_SEARCH_MAX_ITERATIONS,
      maxToolDurationMs: BALANCED_SEARCH_MAX_TOOL_DURATION_MS,
      documentLimit: BALANCED_DOCUMENT_LIMIT,
      webResultsPerCall: BALANCED_WEB_RESULTS_PER_CALL,
    };
  }

  return {
    maxIterations: DEEP_SEARCH_MAX_ITERATIONS,
    maxToolDurationMs: DEEP_SEARCH_MAX_TOOL_DURATION_MS,
    documentLimit: DEEP_DOCUMENT_LIMIT,
    webResultsPerCall: DEEP_WEB_RESULTS_PER_CALL,
  };
}

export function isWebSearchRateLimitError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /\b(429|rate.?limit|too many requests)\b/i.test(error.message);
}
