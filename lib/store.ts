import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateChatTitle } from "./utils";
import type { Citation } from "./db/schema";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  seasonYear: number;
  isPublic: boolean;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  temperature: number;
  typingTitleConversationId: string | null;
  typingTitle: string;

  newConversation: () => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => string;
  startStreaming: () => void;
  updateStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (conversationId: string, citations?: Citation[]) => void;
  resetStreamingState: () => void;
  setTypingTitle: (conversationId: string, title: string) => void;
  clearTypingTitle: () => void;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  setSeasonYear: (conversationId: string, year: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTemperature: (temp: number) => void;
  replaceConversations: (convs: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  updateConversation: (conversationId: string, patch: Partial<Omit<Conversation, "id" | "messages">>) => void;
  setConversationMessages: (conversationId: string, messages: Message[]) => void;
  clearAllConversations: () => void;
  activeConversation: () => Conversation | null;
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
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
      typingTitleConversationId: null,
      typingTitle: "",

      newConversation: () => {
        const id = crypto.randomUUID();
        set((s) => ({
          conversations: sortConversations([
            {
              id,
              title: "New Chat",
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              seasonYear: 2026,
              isPublic: false,
            },
            ...s.conversations,
          ]),
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
        const full: Message = { ...message, id, timestamp: new Date() };
        set((s) => ({
          conversations: sortConversations(
            s.conversations.map((c) => {
              if (c.id !== conversationId) return c;
              const msgs = [...c.messages, full];
              const title = c.title === "New Chat" && message.role === "user"
                ? generateChatTitle(message.content) : c.title;
              return { ...c, messages: msgs, title, updatedAt: new Date() };
            })
          ),
        }));
        return id;
      },

      startStreaming: () => set({ isStreaming: true, streamingContent: "" }),

      updateStreamingContent: (content) => set({ streamingContent: content, isStreaming: true }),

      finalizeStreamingMessage: (conversationId, citations) => {
        const { streamingContent } = get();
        if (!streamingContent) { set({ streamingContent: "", isStreaming: false }); return; }
        const msg: Message = {
          id: crypto.randomUUID(), role: "assistant",
          content: streamingContent, timestamp: new Date(),
          ...(citations?.length && { citations }),
        };
        set((s) => ({
          streamingContent: "", isStreaming: false,
          conversations: sortConversations(
            s.conversations.map((c) =>
              c.id === conversationId
                ? { ...c, messages: [...c.messages, msg], updatedAt: new Date() }
                : c
            )
          ),
        }));
      },

      setTypingTitle: (conversationId, title) =>
        set({ typingTitleConversationId: conversationId, typingTitle: title }),
      clearTypingTitle: () => set({ typingTitleConversationId: null, typingTitle: "" }),

      resetStreamingState: () => set({ streamingContent: "", isStreaming: false }),

      clearConversation: (id) => set((s) => ({
        conversations: sortConversations(
          s.conversations.map((c) =>
            c.id === id ? { ...c, messages: [], title: "New Chat", updatedAt: new Date() } : c
          )
        ),
        streamingContent: "", isStreaming: false,
      })),

      deleteConversation: (id) => set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id);
        return {
          conversations: remaining,
          activeConversationId: s.activeConversationId === id
            ? (remaining[0]?.id ?? null) : s.activeConversationId,
        };
      }),

      setSeasonYear: (id, year) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, seasonYear: year } : c),
      })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setTemperature: (temp) => set({ temperature: temp }),

      replaceConversations: (convs) => set((s) => {
        const existingMessages = new Map(s.conversations.map((conversation) => [conversation.id, conversation.messages]));
        const merged = sortConversations(
          convs.map((conversation) => ({
            ...conversation,
            messages: existingMessages.get(conversation.id) ?? conversation.messages,
          }))
        );

        return {
          conversations: merged,
          activeConversationId:
            s.activeConversationId && merged.some((conversation) => conversation.id === s.activeConversationId)
              ? s.activeConversationId
              : (merged[0]?.id ?? null),
        };
      }),

      upsertConversation: (conversation) => set((s) => {
        const existing = s.conversations.find((item) => item.id === conversation.id);
        const mergedConversation = {
          ...conversation,
          messages: conversation.messages.length > 0
            ? conversation.messages
            : (existing?.messages ?? []),
        };
        const remaining = s.conversations.filter((item) => item.id !== conversation.id);

        return {
          conversations: sortConversations([mergedConversation, ...remaining]),
        };
      }),

      updateConversation: (conversationId, patch) => set((s) => ({
        conversations: sortConversations(
          s.conversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, ...patch }
              : conversation
          )
        ),
      })),

      setConversationMessages: (conversationId, messages) => set((s) => ({
        conversations: sortConversations(
          s.conversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages }
              : conversation
          )
        ),
      })),

      clearAllConversations: () => set({
        conversations: [],
        activeConversationId: null,
        streamingContent: "",
        isStreaming: false,
      }),

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
        sidebarOpen: s.sidebarOpen,
      }),
    }
  )
);
