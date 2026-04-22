import { auth } from "@/auth";
import { DEFAULT_CHAT_MODE } from "@/lib/account-settings";
import { withSessionDbAccess } from "@/lib/db/access";
import {
  conversations,
  messages,
  reports,
  supportRequests,
  users,
} from "@/lib/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userPromise = (async () => {
    try {
      return await withSessionDbAccess(session, (tx) => tx
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          createdAt: users.createdAt,
          defaultChatMode: users.defaultChatMode,
          preferredName: users.preferredName,
          teamNumber: users.teamNumber,
          onboardedAt: users.onboardedAt,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)
        .then((rows) => rows[0] ?? null));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "42703"
      ) {
        return await withSessionDbAccess(session, (tx) => tx
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            createdAt: users.createdAt,
          })
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1)
          .then((rows) => rows[0] ? {
            ...rows[0],
            defaultChatMode: DEFAULT_CHAT_MODE,
            preferredName: null,
            teamNumber: null,
            onboardedAt: null,
          } : null));
      }

      throw error;
    }
  })();

  const [user, conversationRows, supportRows, reportRows] = await Promise.all([
    userPromise,
    withSessionDbAccess(session, (tx) => tx
      .select()
      .from(conversations)
      .where(eq(conversations.userId, session.user.id))
      .orderBy(desc(conversations.updatedAt))),
    withSessionDbAccess(session, (tx) => tx
      .select()
      .from(supportRequests)
      .where(eq(supportRequests.userId, session.user.id))
      .orderBy(desc(supportRequests.createdAt))),
    withSessionDbAccess(session, (tx) => tx
      .select()
      .from(reports)
      .where(eq(reports.reportedById, session.user.id))
      .orderBy(desc(reports.createdAt))),
  ]);

  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const messageRows = conversationIds.length === 0
    ? []
    : await withSessionDbAccess(session, (tx) => tx
        .select()
        .from(messages)
        .where(inArray(messages.conversationId, conversationIds))
        .orderBy(asc(messages.createdAt)));

  const messagesByConversation = new Map<string, typeof messageRows>();
  for (const message of messageRows) {
    const existing = messagesByConversation.get(message.conversationId) ?? [];
    existing.push(message);
    messagesByConversation.set(message.conversationId, existing);
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    user,
    settings: {
      defaultChatMode: user?.defaultChatMode ?? DEFAULT_CHAT_MODE,
      preferredName: user?.preferredName ?? null,
      teamNumber: user?.teamNumber ?? null,
      onboardedAt: user?.onboardedAt ?? null,
    },
    conversations: conversationRows.map((conversation) => ({
      ...conversation,
      messages: messagesByConversation.get(conversation.id) ?? [],
    })),
    supportRequests: supportRows,
    reports: reportRows,
  });
}
