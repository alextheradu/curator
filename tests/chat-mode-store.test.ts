// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { useChatStore } from "@/lib/store";

function resetStore() {
  useChatStore.setState({
    conversations: [],
    activeConversationId: null,
    defaultChatMode: "veteran",
  });
}

afterEach(() => {
  resetStore();
});

describe("useChatStore chat mode", () => {
  it("is a single global default: switching it updates every conversation's chatMode", () => {
    resetStore();
    const id1 = useChatStore.getState().newConversation();
    const id2 = useChatStore.getState().newConversation();

    useChatStore.getState().setDefaultChatMode("rookie");

    const { conversations, defaultChatMode } = useChatStore.getState();
    expect(defaultChatMode).toBe("rookie");
    expect(conversations.find((c) => c.id === id1)?.chatMode).toBe("rookie");
    expect(conversations.find((c) => c.id === id2)?.chatMode).toBe("rookie");
  });

  it("does not clear messages or touch any other conversation field when switching modes", () => {
    resetStore();
    const id = useChatStore.getState().newConversation();
    useChatStore.getState().addMessage(id, { role: "user", content: "What's a swerve drive?" });

    useChatStore.getState().setDefaultChatMode("rookie");

    const conversation = useChatStore.getState().conversations.find((c) => c.id === id);
    expect(conversation?.messages).toHaveLength(1);
    expect(conversation?.messages[0].content).toBe("What's a swerve drive?");
  });

  it("new conversations pick up the current default chat mode", () => {
    resetStore();
    useChatStore.getState().setDefaultChatMode("rookie");
    const id = useChatStore.getState().newConversation();

    expect(useChatStore.getState().conversations.find((c) => c.id === id)?.chatMode).toBe("rookie");
  });
});
