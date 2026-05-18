import { unstable_cache, revalidateTag } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { withDbAccessContext } from "@/lib/db/access";
import { conversations, messages } from "@/lib/db/schema";
import { isUuid } from "@/lib/uuid";

type ConversationRow = typeof conversations.$inferSelect;

export function toPublicConversationDTO(conversation: ConversationRow) {
  return {
    id: conversation.id,
    title: conversation.title,
    seasonYear: conversation.seasonYear,
    isPublic: conversation.isPublic,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function getPublicConversationCacheTag(id: string) {
  return `public-conversation:${id}`;
}

export function getPublicConversationMessagesCacheTag(id: string) {
  return `public-conversation-messages:${id}`;
}

export function revalidatePublicConversation(id: string) {
  revalidateTag(getPublicConversationCacheTag(id), "max");
  revalidateTag(getPublicConversationMessagesCacheTag(id), "max");
}

export async function getCachedPublicConversation(id: string) {
  if (!isUuid(id)) return null;

  const load = unstable_cache(
    async () => withDbAccessContext({}, async (tx) => {
      const [conversation] = await tx
        .select()
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conversation?.isPublic) {
        return null;
      }

      return toPublicConversationDTO(conversation);
    }),
    ["public-conversation", id],
    {
      revalidate: 300,
      tags: [getPublicConversationCacheTag(id)],
    },
  );

  return load();
}

export async function getCachedPublicConversationMessages(id: string) {
  if (!isUuid(id)) return null;

  const load = unstable_cache(
    async () => withDbAccessContext({}, async (tx) => {
      const [conversation] = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.id, id))
        .limit(1);

      if (!conversation) {
        return null;
      }

      return tx
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(asc(messages.createdAt));
    }),
    ["public-conversation-messages", id],
    {
      revalidate: 300,
      tags: [getPublicConversationMessagesCacheTag(id)],
    },
  );

  return load();
}
