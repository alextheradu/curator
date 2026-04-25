import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateChatTitle } from "./utils";
import type { Citation } from "./db/schema";
import { DEFAULT_SEASON_YEAR } from "./seasons";
import { randomUuid } from "./uuid";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export type ChatMode = "rookie" | "veteran";

export interface Conversation {
  id: string;
  title: string;
  searchDescription?: string | null;
  projectId: string | null;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  seasonYear: number;
  isPublic: boolean;
  chatMode: ChatMode;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  temperature: number;
  defaultChatMode: ChatMode;
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
  setDefaultChatMode: (mode: ChatMode) => void;
  shareDialogConversationId: string | null;
  setShareDialogConversationId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTemperature: (temp: number) => void;
  resetSettings: () => void;
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
      defaultChatMode: "veteran",
      typingTitleConversationId: null,
      typingTitle: "",

      newConversation: () => {
        const id = randomUuid();
        set((s) => ({
          conversations: sortConversations([
            {
              id,
              title: "New Chat",
              searchDescription: null,
              projectId: null,
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              seasonYear: DEFAULT_SEASON_YEAR,
              isPublic: false,
              chatMode: s.defaultChatMode,
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
        const id = randomUuid();
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
          id: randomUuid(), role: "assistant",
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

      setDefaultChatMode: (mode) => set((s) => ({
        defaultChatMode: mode,
        conversations: s.conversations.map((conversation) => ({
          ...conversation,
          chatMode: mode,
        })),
      })),

      shareDialogConversationId: null,
      setShareDialogConversationId: (id) => set({ shareDialogConversationId: id }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setTemperature: (temp) => set({ temperature: temp }),
      resetSettings: () => set((s) => ({
        temperature: 0.2,
        defaultChatMode: "veteran",
        conversations: s.conversations.map((conversation) => ({
          ...conversation,
          chatMode: "veteran",
        })),
      })),

      replaceConversations: (convs) => set((s) => {
        const existingMessages = new Map(s.conversations.map((conversation) => [conversation.id, conversation.messages]));
        const merged = sortConversations(
          convs.map((conversation) => ({
            ...conversation,
            chatMode: conversation.chatMode ?? s.defaultChatMode,
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
          chatMode: conversation.chatMode ?? existing?.chatMode ?? s.defaultChatMode,
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
        defaultChatMode: s.defaultChatMode,
      }),
    }
  )
);
