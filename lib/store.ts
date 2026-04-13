import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateChatTitle } from "./utils";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  citations?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  seasonYear: number;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  temperature: number;
  apiKeyOverride: string;

  newConversation: () => string;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (conversationId: string) => void;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  setSeasonYear: (conversationId: string, year: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTemperature: (temp: number) => void;
  setApiKeyOverride: (key: string) => void;
  activeConversation: () => Conversation | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      streamingContent: "",
      isStreaming: false,
      sidebarOpen: true,
      settingsOpen: false,
      temperature: 0.2,
      apiKeyOverride: "",

      newConversation: () => {
        const id = crypto.randomUUID();
        const conversation: Conversation = {
          id, title: "New Chat", messages: [],
          createdAt: new Date(), updatedAt: new Date(), seasonYear: 2025,
        };
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          activeConversationId: id,
          streamingContent: "",
          isStreaming: false,
        }));
        return id;
      },

      setActiveConversation: (id) =>
        set({ activeConversationId: id, streamingContent: "", isStreaming: false }),

      addMessage: (conversationId, message) => {
        const id = crypto.randomUUID();
        const fullMessage: Message = { ...message, id, timestamp: new Date() };
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages, fullMessage];
            const title =
              c.title === "New Chat" && message.role === "user"
                ? generateChatTitle(message.content)
                : c.title;
            return { ...c, messages, title, updatedAt: new Date() };
          }),
        }));
        return id;
      },

      updateStreamingContent: (content) =>
        set({ streamingContent: content, isStreaming: true }),

      finalizeStreamingMessage: (conversationId) => {
        const { streamingContent } = get();
        if (!streamingContent) return;
        const message: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: streamingContent,
          timestamp: new Date(),
        };
        set((s) => ({
          streamingContent: "",
          isStreaming: false,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
              : c
          ),
        }));
      },

      clearConversation: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [], title: "New Chat", updatedAt: new Date() }
              : c
          ),
          streamingContent: "",
          isStreaming: false,
        })),

      deleteConversation: (conversationId) =>
        set((s) => {
          const remaining = s.conversations.filter((c) => c.id !== conversationId);
          return {
            conversations: remaining,
            activeConversationId:
              s.activeConversationId === conversationId
                ? (remaining[0]?.id ?? null)
                : s.activeConversationId,
          };
        }),

      setSeasonYear: (conversationId, year) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, seasonYear: year } : c
          ),
        })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setTemperature: (temp) => set({ temperature: temp }),
      setApiKeyOverride: (key) => set({ apiKeyOverride: key }),

      activeConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },
    }),
    {
      name: "curator-chat-store",
      partialize: (s) => ({
        conversations: s.conversations,
        activeConversationId: s.activeConversationId,
        temperature: s.temperature,
        apiKeyOverride: s.apiKeyOverride,
        sidebarOpen: s.sidebarOpen,
      }),
    }
  )
);
