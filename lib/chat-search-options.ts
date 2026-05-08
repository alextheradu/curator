export type ChatSearchOptions = {
  deepSearch: boolean;
  factCheck: boolean;
};

export type DeepSearchConfig = {
  maxIterations: number;
  maxToolDurationMs: number;
  documentLimit: number;
};

const FAST_DOCUMENT_LIMIT = 6;
const FAST_DOCUMENT_LIMIT_MAX = 20;
const DEEP_DOCUMENT_LIMIT = 12;
const DEEP_DOCUMENT_LIMIT_MAX = 50;
const DEEP_SEARCH_MAX_ITERATIONS = 12;
const DEEP_SEARCH_MAX_TOOL_DURATION_MS = 90_000;

export function parseChatSearchOptions(body: unknown): ChatSearchOptions {
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};

  return {
    deepSearch: input.deepSearch === true,
    factCheck: input.factCheck === true,
  };
}

export function clampDocumentSearchLimit(limit: unknown, deepSearch: boolean) {
  const fallback = deepSearch ? DEEP_DOCUMENT_LIMIT : FAST_DOCUMENT_LIMIT;
  const max = deepSearch ? DEEP_DOCUMENT_LIMIT_MAX : FAST_DOCUMENT_LIMIT_MAX;
  const numericLimit = typeof limit === "number" && Number.isFinite(limit) ? limit : fallback;

  return Math.min(Math.max(Math.trunc(numericLimit), 1), max);
}

export function buildDeepSearchConfig(deepSearch: boolean): DeepSearchConfig {
  if (!deepSearch) {
    return {
      maxIterations: 0,
      maxToolDurationMs: 0,
      documentLimit: FAST_DOCUMENT_LIMIT,
    };
  }

  return {
    maxIterations: DEEP_SEARCH_MAX_ITERATIONS,
    maxToolDurationMs: DEEP_SEARCH_MAX_TOOL_DURATION_MS,
    documentLimit: DEEP_DOCUMENT_LIMIT,
  };
}

export function isWebSearchRateLimitError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /\b(429|rate.?limit|too many requests)\b/i.test(error.message);
}
