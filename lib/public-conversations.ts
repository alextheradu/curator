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
  // Expire immediately rather than marking stale: with the "max" profile the
  // stale transcript is still served once more while a background refresh
  // runs, which would disclose a chat the owner just unshared or deleted.
  revalidateTag(getPublicConversationCacheTag(id), { expire: 0 });
  revalidateTag(getPublicConversationMessagesCacheTag(id), { expire: 0 });
}

/**
 * Uncached access check. The isPublic/deletedAt decision must never come from
 * a cache entry: revocation has to take effect on the very next request, so
 * only the (immutable-once-public) message payload below is cached.
 */
async function loadPublicConversationRow(id: string) {
  return withDbAccessContext({}, async (tx) => {
    const [conversation] = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    // A soft-deleted conversation must stop being publicly reachable
    // immediately, not just drop out of the owner's own history list.
    if (!conversation?.isPublic || conversation.deletedAt) {
      return null;
    }

    return conversation;
  });
}

export async function getCachedPublicConversation(id: string) {
  if (!isUuid(id)) return null;

  const conversation = await loadPublicConversationRow(id);
  return conversation ? toPublicConversationDTO(conversation) : null;
}

export async function getCachedPublicConversationMessages(id: string) {
  if (!isUuid(id)) return null;

  const conversation = await loadPublicConversationRow(id);
  if (!conversation) return null;

  const load = unstable_cache(
    async () => withDbAccessContext({}, (tx) => tx
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(asc(messages.createdAt))),
    ["public-conversation-messages", id],
    {
      revalidate: 300,
      tags: [getPublicConversationMessagesCacheTag(id)],
    },
  );

  return load();
}
