import { afterEach, describe, expect, test, vi } from "vitest";

describe("security-sensitive cookie serialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("serializes HttpOnly credential cookies", async () => {
    const { serializeCookie } = await import("@/lib/cookies");

    expect(serializeCookie("guest_session_id", "abc", { httpOnly: true })).toContain("HttpOnly");
  });

  test("guest session cookie is HttpOnly and Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { serializeGuestSessionCookie } = await import("@/lib/guest-session");

    const cookie = serializeGuestSessionCookie("guest-id");

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });
});

describe("randomUuid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test("throws instead of falling back to Math.random when Web Crypto is missing", async () => {
    vi.stubGlobal("crypto", undefined);
    vi.resetModules();
    const { randomUuid } = await import("@/lib/uuid");

    expect(() => randomUuid()).toThrow(/Web Crypto/);
  });
});

describe("Sentry configuration helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  test("defaults session replay sampling to disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE", "");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE", "");
    vi.resetModules();
    const { getSentryReplayConfig } = await import("@/lib/sentry");

    expect(getSentryReplayConfig()).toEqual({
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      enabled: false,
    });
  });
});

describe("Qdrant client config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("includes API key when QDRANT_API_KEY is configured", async () => {
    vi.stubEnv("QDRANT_URL", "http://localhost:6333");
    vi.stubEnv("QDRANT_API_KEY", "secret-qdrant-key");
    const { buildQdrantClientConfig } = await import("@/lib/qdrant");

    expect(buildQdrantClientConfig()).toEqual({
      url: "http://localhost:6333",
      apiKey: "secret-qdrant-key",
    });
  });
});

describe("admin user mutation authorization", () => {
  test("requires superadmin rights to promote users", async () => {
    const { validateAdminUserMutation } = await import("@/lib/admin-user-mutations");

    expect(validateAdminUserMutation({
      action: "promote",
      actorUserId: "admin-a",
      actorIsSuperAdmin: false,
      targetUser: { id: "user-b", email: "user@example.com", isAdmin: false },
    })).toEqual({ ok: false, status: 403, error: "Only superadmins can promote admins" });
  });

  test("blocks self-ban, self-demote, and self-delete", async () => {
    const { validateAdminUserMutation } = await import("@/lib/admin-user-mutations");

    for (const action of ["ban", "demote", "delete"] as const) {
      expect(validateAdminUserMutation({
        action,
        actorUserId: "admin-a",
        actorIsSuperAdmin: true,
        targetUser: { id: "admin-a", email: "admin@example.com", isAdmin: true },
      })).toEqual({ ok: false, status: 400, error: "Admins cannot modify their own admin access" });
    }
  });

  test("requires superadmin rights to modify another admin", async () => {
    const { validateAdminUserMutation } = await import("@/lib/admin-user-mutations");

    expect(validateAdminUserMutation({
      action: "ban",
      actorUserId: "admin-a",
      actorIsSuperAdmin: false,
      targetUser: { id: "admin-b", email: "other-admin@example.com", isAdmin: true },
    })).toEqual({ ok: false, status: 403, error: "Only superadmins can modify admins" });
  });
});
