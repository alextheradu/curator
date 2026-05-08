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
      deepSearch: false,
      factCheck: false,
    });
  });

  it("only enables deep search from an explicit boolean request", () => {
    expect(parseChatSearchOptions({ deepSearch: true, factCheck: true })).toEqual({
      deepSearch: true,
      factCheck: true,
    });
    expect(parseChatSearchOptions({ deepSearch: "true", factCheck: "true" })).toEqual({
      deepSearch: false,
      factCheck: false,
    });
  });

  it("allows broader document search in deep mode while clamping extremes", () => {
    expect(clampDocumentSearchLimit(undefined, false)).toBe(6);
    expect(clampDocumentSearchLimit(100, false)).toBe(20);
    expect(clampDocumentSearchLimit(undefined, true)).toBe(12);
    expect(clampDocumentSearchLimit(100, true)).toBe(50);
    expect(clampDocumentSearchLimit(0, true)).toBe(1);
  });

  it("uses a larger but finite deep-search agent budget", () => {
    expect(buildDeepSearchConfig(false)).toEqual({
      maxIterations: 0,
      maxToolDurationMs: 0,
      documentLimit: 6,
    });

    expect(buildDeepSearchConfig(true).maxIterations).toBeGreaterThan(4);
    expect(buildDeepSearchConfig(true).maxToolDurationMs).toBeGreaterThan(30_000);
    expect(buildDeepSearchConfig(true).documentLimit).toBe(12);
  });

  it("detects web search rate-limit failures", () => {
    expect(isWebSearchRateLimitError(new Error("LangSearch 429"))).toBe(true);
    expect(isWebSearchRateLimitError(new Error("HTTP 429 Too Many Requests"))).toBe(true);
    expect(isWebSearchRateLimitError(new Error("LangSearch 500"))).toBe(false);
  });
});
