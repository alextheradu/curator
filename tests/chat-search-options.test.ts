import { describe, expect, it } from "vitest";

import {
  buildDeepSearchConfig,
  clampDocumentSearchLimit,
  isWebSearchRateLimitError,
  parseChatSearchOptions,
} from "@/lib/chat-search-options";

describe("chat search options", () => {
  it("defaults to fast chat without deep search", () => {
    expect(parseChatSearchOptions({})).toEqual({
      searchMode: "fast",
      factCheck: false,
    });
  });

  it("supports explicit search modes and the previous deep search boolean", () => {
    expect(parseChatSearchOptions({ searchMode: "balanced" })).toEqual({
      searchMode: "balanced",
      factCheck: false,
    });
    expect(parseChatSearchOptions({ searchMode: "deep", factCheck: true })).toEqual({
      searchMode: "deep",
      factCheck: true,
    });
    expect(parseChatSearchOptions({ deepSearch: true, factCheck: true })).toEqual({
      searchMode: "deep",
      factCheck: true,
    });
    expect(parseChatSearchOptions({ deepSearch: "true", factCheck: "true" })).toEqual({
      searchMode: "fast",
      factCheck: false,
    });
  });

  it("allows broader document search in deep mode while clamping extremes", () => {
    expect(clampDocumentSearchLimit(undefined, false)).toBe(6);
    expect(clampDocumentSearchLimit(100, false)).toBe(20);
    expect(clampDocumentSearchLimit(undefined, "balanced")).toBe(8);
    expect(clampDocumentSearchLimit(100, "balanced")).toBe(20);
    expect(clampDocumentSearchLimit(undefined, true)).toBe(12);
    expect(clampDocumentSearchLimit(100, true)).toBe(50);
    expect(clampDocumentSearchLimit(0, true)).toBe(1);
  });

  it("uses a larger but finite deep-search agent budget", () => {
    expect(buildDeepSearchConfig(false)).toEqual({
      maxIterations: 3,
      maxToolDurationMs: 15_000,
      documentLimit: 6,
      webResultsPerCall: 0,
    });

    expect(buildDeepSearchConfig("balanced").maxIterations).toBe(4);
    expect(buildDeepSearchConfig("balanced").webResultsPerCall).toBe(4);
    expect(buildDeepSearchConfig(true).maxIterations).toBeGreaterThan(4);
    expect(buildDeepSearchConfig(true).maxToolDurationMs).toBeGreaterThan(30_000);
    expect(buildDeepSearchConfig(true).documentLimit).toBe(12);
    expect(buildDeepSearchConfig(true).webResultsPerCall).toBe(8);
  });

  it("detects web search rate-limit failures", () => {
    expect(isWebSearchRateLimitError(new Error("LangSearch 429"))).toBe(true);
    expect(isWebSearchRateLimitError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
    expect(isWebSearchRateLimitError(new Error("LangSearch 500"))).toBe(false);
  });
});
