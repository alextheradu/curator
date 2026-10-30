import { and, asc, eq, inArray } from "drizzle-orm";
import type { ClientChatMessage } from "@/lib/chat-request-validation";
import { withGuestDbAccess, withSessionDbAccess } from "@/lib/db/access";
import { conversations, messages } from "@/lib/db/schema";

const MAX_HISTORY_MESSAGES = 40;

type SessionLike = { user?: { id?: string | null; isAdmin?: boolean | null } };

type Owner =
  | { session: SessionLike; guestId?: undefined }
  | { session?: undefined; guestId: string };

/**
 * Build the model's conversation history from the rows actually stored for a
 * conversation, instead of trusting the client's copy of it. The client may
 * only persist user turns; assistant turns are written server-side from real
 * model output. If the history sent to the model were client-authored, forged
 * assistant turns could steer the next answer, and that answer would then be
 * stored - and shown on a shared link - as a genuine Curator reply.
 *
 * Returns null when the caller does not own the conversation.
 */
export async function loadOwnedConversationHistory(
  owner: Owner,
  conversationId: string,
  clientMessages: ClientChatMessage[],
): Promise<ClientChatMessage[] | null> {
  const load = async (
    tx: Parameters<Parameters<typeof withGuestDbAccess>[1]>[0],
    ownershipFilter: ReturnType<typeof and>,
  ) => {
    const [conversation] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(ownershipFilter)
      .limit(1);

    if (!conversation) return null;

    return tx
      .select({ role: messages.role, content: messages.content })
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), inArray(messages.role, ["user", "assistant"])))
      .orderBy(asc(messages.createdAt));
  };

  let rows: Array<{ role: string; content: string }> | null;
  if (owner.session) {
    const userId = owner.session.user?.id;
    if (!userId) return null;
    rows = await withSessionDbAccess(owner.session, (tx) => load(
      tx,
      and(eq(conversations.id, conversationId), eq(conversations.userId, userId)),
    ));
  } else {
    rows = await withGuestDbAccess(owner.guestId, (tx) => load(
      tx,
      and(eq(conversations.id, conversationId), eq(conversations.guestId, owner.guestId)),
    ));
  }

  if (!rows) return null;

  const history: ClientChatMessage[] = rows
    .filter((row) => row.content.trim().length > 0)
    .map((row) => ({ role: row.role as "user" | "assistant", content: row.content }));

  // The client persists the new user turn before calling chat. If that write
  // failed (or raced), the stored transcript ends before the question being
  // asked; fall back to the client's own last user turn so the request still
  // answers it - that turn is user-authored, which the client is allowed to be.
  const clientLastUser = [...clientMessages].reverse().find((message) => message.role === "user");
  const storedLast = history.at(-1);
  if (
    clientLastUser
    && (!storedLast || storedLast.role !== "user" || storedLast.content !== clientLastUser.content)
  ) {
    history.push(clientLastUser);
  }

  return history.slice(-MAX_HISTORY_MESSAGES);
}
