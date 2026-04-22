import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { ChatApp } from "@/components/chat/ChatApp";
import { withSessionDbAccess } from "@/lib/db/access";
import { conversations } from "@/lib/db/schema";
import { getCachedPublicConversation } from "@/lib/public-conversations";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const session = await auth();
  const { id } = await params;
  const conversation = session?.user?.id
    ? await withSessionDbAccess(session, async (tx) => {
        const [row] = await tx.select().from(conversations).where(eq(conversations.id, id)).limit(1);
        return row ?? null;
      })
    : await getCachedPublicConversation(id);

  if (!conversation) {
    return {
      title: "Chat",
      robots: NO_INDEX_ROBOTS,
    };
  }

  const isOwner = session?.user?.id === conversation.userId;
  const canView = isOwner || conversation.isPublic;

  return {
    title: canView ? (isOwner ? conversation.title : "Shared Chat") : "Chat",
    robots: NO_INDEX_ROBOTS,
  };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ChatApp requestedConversationId={id} />;
}
