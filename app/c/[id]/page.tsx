import { ChatApp } from "@/components/chat/ChatApp";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ChatApp requestedConversationId={id} />;
}
