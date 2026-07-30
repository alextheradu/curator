import { and, eq } from "drizzle-orm";
import { withGuestDbAccess, withSessionDbAccess } from "@/lib/db/access";
import { conversations, messages, type Citation } from "@/lib/db/schema";
import { randomUuid } from "@/lib/uuid";

type SessionLike = { user?: { id?: string | null; isAdmin?: boolean | null } };

type PersistAssistantMessageArgs = {
  conversationId: string;
  messageId?: string | null;
  content: string;
  citations?: Citation[];
} & (
  | { session: SessionLike; guestId?: undefined }
  | { session?: undefined; guestId: string }
);

/**
 * Persist an assistant message server-side from actual model output. This is the
 * only path that writes assistant-role rows — clients cannot, so shared/public
 * conversations can't show fabricated Curator answers.
 *
 * Ownership is enforced by the WHERE clause plus row-level security: the insert
 * only lands if the caller (user or guest) owns the target conversation.
 * Returns the persisted message id, or null if the conversation isn't owned.
 */
export async function persistAssistantMessage(
  args: PersistAssistantMessageArgs,
): Promise<string | null> {
  const trimmed = args.content.trim();
  if (!trimmed) {
    return null;
  }

  const messageId = args.messageId ?? randomUuid();
  const values = {
    id: messageId,
    conversationId: args.conversationId,
    role: "assistant" as const,
    content: args.content,
    ...(args.citations && args.citations.length > 0 ? { citations: args.citations } : {}),
  };

  const run = async (
    tx: Parameters<Parameters<typeof withGuestDbAccess>[1]>[0],
    ownershipFilter: ReturnType<typeof and>,
  ) => {
    const [conversation] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(ownershipFilter)
      .limit(1);

    if (!conversation) {
      return null;
    }

    const [inserted] = await tx.insert(messages).values(values).returning({ id: messages.id });
    await tx
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, args.conversationId));

    return inserted?.id ?? null;
  };

  if (args.session) {
    const userId = args.session.user?.id;
    if (!userId) {
      return null;
    }

    return withSessionDbAccess(args.session, (tx) => run(
      tx,
      and(eq(conversations.id, args.conversationId), eq(conversations.userId, userId)),
    ));
  }

  return withGuestDbAccess(args.guestId, (tx) => run(
    tx,
    and(eq(conversations.id, args.conversationId), eq(conversations.guestId, args.guestId)),
  ));
}
