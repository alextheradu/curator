import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasValidMutationOrigin, validateJsonMutationRequest } from "@/lib/request-security";

const ALLOWED = "https://curatorfrc.com";

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ALLOWED;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

function makeRequest(init: { method?: string; headers?: Record<string, string> }) {
  // Plain Request (not NextRequest) mirrors what route handlers receive after
  // bundling, where `instanceof NextRequest` is unreliable.
  return new Request("https://curatorfrc.com/api/chat", {
    method: init.method ?? "POST",
    headers: init.headers ?? {},
  });
}

describe("hasValidMutationOrigin", () => {
  it("allows same-origin requests", () => {
    expect(hasValidMutationOrigin(makeRequest({ headers: { origin: ALLOWED } }))).toBe(true);
  });

  it("rejects cross-origin requests", () => {
    expect(hasValidMutationOrigin(makeRequest({ headers: { origin: "https://evil.com" } }))).toBe(false);
  });

  it("allows non-mutating methods regardless of origin", () => {
    expect(hasValidMutationOrigin(makeRequest({ method: "GET", headers: { origin: "https://evil.com" } }))).toBe(true);
  });

  it("falls back to Sec-Fetch-Site when Origin header is absent", () => {
    expect(hasValidMutationOrigin(makeRequest({ headers: { "sec-fetch-site": "same-origin" } }))).toBe(true);
    expect(hasValidMutationOrigin(makeRequest({ headers: { "sec-fetch-site": "cross-site" } }))).toBe(false);
  });

  it("rejects missing Origin header in strict mode", () => {
    expect(
      hasValidMutationOrigin(makeRequest({ headers: { "sec-fetch-site": "same-origin" } }), { requireOriginHeader: true }),
    ).toBe(false);
  });
});

describe("validateJsonMutationRequest", () => {
  it("enforces the origin check on a plain Request (regression: instanceof gate)", () => {
    const result = validateJsonMutationRequest(
      makeRequest({ headers: { origin: "https://evil.com", "content-type": "application/json" } }),
    );
    expect(result?.status).toBe(403);
  });

  it("returns 415 when content-type is not JSON", () => {
    const result = validateJsonMutationRequest(makeRequest({ headers: { origin: ALLOWED } }));
    expect(result?.status).toBe(415);
  });

  it("passes a valid same-origin JSON request", () => {
    const result = validateJsonMutationRequest(
      makeRequest({ headers: { origin: ALLOWED, "content-type": "application/json" } }),
    );
    expect(result).toBeNull();
  });
});
