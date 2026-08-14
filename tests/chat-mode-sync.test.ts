import { describe, expect, it } from "vitest";
import { shouldSyncAccountChatMode } from "@/lib/chat-mode-sync";

describe("shouldSyncAccountChatMode", () => {
  it("syncs on the first sign-in (no user previously synced)", () => {
    expect(shouldSyncAccountChatMode(null, "user-1")).toBe(true);
  });

  it("does not re-sync on a session refresh for the same user", () => {
    expect(shouldSyncAccountChatMode("user-1", "user-1")).toBe(false);
  });

  it("syncs again after switching to a different account", () => {
    expect(shouldSyncAccountChatMode("user-1", "user-2")).toBe(true);
  });

  it("does not sync when signed out", () => {
    expect(shouldSyncAccountChatMode("user-1", null)).toBe(false);
    expect(shouldSyncAccountChatMode(null, null)).toBe(false);
  });
});
