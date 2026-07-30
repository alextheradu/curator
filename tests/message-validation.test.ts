import { describe, expect, it } from "vitest";

import { parsePersistedMessageInput } from "@/lib/message-validation";

describe("parsePersistedMessageInput", () => {
  it("accepts a valid user message", () => {
    const result = parsePersistedMessageInput({ role: "user", content: "hello" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBe("user");
      expect(result.value.content).toBe("hello");
    }
  });

  it("rejects assistant-role messages (clients cannot forge Curator answers)", () => {
    const result = parsePersistedMessageInput({ role: "assistant", content: "fake answer" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/role must be user/i);
    }
  });

  it("rejects an unsupported role", () => {
    const result = parsePersistedMessageInput({ role: "system", content: "x" });
    expect(result.ok).toBe(false);
  });

  it("forces the persisted role to user even if extra fields are present", () => {
    const result = parsePersistedMessageInput({ role: "user", content: "hi", citations: [] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.role).toBe("user");
    }
  });

  it("rejects empty content", () => {
    expect(parsePersistedMessageInput({ role: "user", content: "   " }).ok).toBe(false);
  });

  it("rejects a non-UUID id", () => {
    const result = parsePersistedMessageInput({ id: "not-a-uuid", role: "user", content: "hi" });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid UUID id", () => {
    const result = parsePersistedMessageInput({
      id: "00000000-0000-4000-8000-000000000000",
      role: "user",
      content: "hi",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("00000000-0000-4000-8000-000000000000");
    }
  });
});
