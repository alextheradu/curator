import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateConversationDerivedCaches: vi.fn(),
  revalidatePublicConversation: vi.fn(),
  withGuestDbAccess: vi.fn(),
  withSessionDbAccess: vi.fn(),
}));

vi.mock("@/lib/cache-tags", () => ({
  revalidateConversationDerivedCaches: mocks.revalidateConversationDerivedCaches,
}));

vi.mock("@/lib/db/access", () => ({
  withGuestDbAccess: mocks.withGuestDbAccess,
  withSessionDbAccess: mocks.withSessionDbAccess,
}));

vi.mock("@/lib/public-conversations", () => ({
  revalidatePublicConversation: mocks.revalidatePublicConversation,
}));

import { persistAssistantMessage } from "@/lib/assistant-messages";

function createTransaction(options?: { ownsConversation?: boolean }) {
  const ownsConversation = options?.ownsConversation ?? true;
  const returning = vi.fn().mockResolvedValue([{ id: "assistant-message-id" }]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where: updateWhere });
  const update = vi.fn().mockReturnValue({ set });
  const limit = vi.fn().mockResolvedValue(ownsConversation ? [{ id: "conversation-id" }] : []);
  const selectWhere = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where: selectWhere });
  const select = vi.fn().mockReturnValue({ from });

  return {
    tx: { insert, select, update },
    spies: { insert, returning, set, update, values },
  };
}

describe("persistAssistantMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("persists authenticated model output and invalidates conversation caches", async () => {
    const { tx, spies } = createTransaction();
    mocks.withSessionDbAccess.mockImplementation(async (_session, callback) => callback(tx));

    const result = await persistAssistantMessage({
      session: { user: { id: "user-id" } },
      conversationId: "conversation-id",
      messageId: "assistant-message-id",
      content: "  Model answer.  ",
      citations: [{ type: "web", label: "Rules", url: "https://example.com/rules" }],
    });

    expect(result).toBe("assistant-message-id");
    expect(mocks.withGuestDbAccess).not.toHaveBeenCalled();
    expect(spies.values).toHaveBeenCalledWith({
      id: "assistant-message-id",
      conversationId: "conversation-id",
      role: "assistant",
      content: "  Model answer.  ",
      citations: [{ type: "web", label: "Rules", url: "https://example.com/rules" }],
    });
    expect(spies.update).toHaveBeenCalled();
    expect(mocks.revalidatePublicConversation).toHaveBeenCalledWith("conversation-id");
    expect(mocks.revalidateConversationDerivedCaches).toHaveBeenCalledOnce();
  });

  test("uses guest-scoped access for guest conversations", async () => {
    const { tx } = createTransaction();
    mocks.withGuestDbAccess.mockImplementation(async (_guestId, callback) => callback(tx));

    const result = await persistAssistantMessage({
      guestId: "guest-id",
      conversationId: "conversation-id",
      content: "Guest answer",
    });

    expect(result).toBe("assistant-message-id");
    expect(mocks.withGuestDbAccess).toHaveBeenCalledWith("guest-id", expect.any(Function));
    expect(mocks.withSessionDbAccess).not.toHaveBeenCalled();
  });

  test("does not insert or invalidate caches when the conversation is not owned", async () => {
    const { tx, spies } = createTransaction({ ownsConversation: false });
    mocks.withSessionDbAccess.mockImplementation(async (_session, callback) => callback(tx));

    const result = await persistAssistantMessage({
      session: { user: { id: "user-id" } },
      conversationId: "other-conversation-id",
      content: "Model answer",
    });

    expect(result).toBeNull();
    expect(spies.insert).not.toHaveBeenCalled();
    expect(mocks.revalidatePublicConversation).not.toHaveBeenCalled();
    expect(mocks.revalidateConversationDerivedCaches).not.toHaveBeenCalled();
  });

  test("ignores empty output without opening a database transaction", async () => {
    const result = await persistAssistantMessage({
      guestId: "guest-id",
      conversationId: "conversation-id",
      content: "   ",
    });

    expect(result).toBeNull();
    expect(mocks.withGuestDbAccess).not.toHaveBeenCalled();
    expect(mocks.withSessionDbAccess).not.toHaveBeenCalled();
  });
});
