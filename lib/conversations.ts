import type { Citation } from "@/lib/db/schema";
import type { Conversation, Message, Role } from "@/lib/store";

export type ConversationRecord = {
  id: string;
  title: string;
  searchDescription?: string | null;
  seasonYear: number;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MessageRecord = {
  id: string;
  role: Role;
  content: string;
  citations?: Citation[];
  createdAt?: string | Date;
  timestamp?: string | Date;
};

export function normalizeMessage(message: MessageRecord): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    citations: message.citations,
    timestamp: new Date(message.timestamp ?? message.createdAt ?? new Date()),
  };
}

export function normalizeConversation(
  conversation: ConversationRecord,
  messages: Message[] = []
): Conversation {
  return {
    id: conversation.id,
    title: conversation.title,
    searchDescription: conversation.searchDescription ?? null,
    seasonYear: conversation.seasonYear,
    isPublic: conversation.isPublic,
    createdAt: new Date(conversation.createdAt),
    updatedAt: new Date(conversation.updatedAt),
    messages,
  };
}
