import { sql } from "drizzle-orm";
import { withSystemDbAccess } from "@/lib/db/access";
import { conversations } from "@/lib/db/schema";

export async function cleanupExpiredGuestConversations() {
  const rows = await withSystemDbAccess((tx) => tx.execute(sql`
    delete from ${conversations}
    where ${conversations.guestId} is not null
      and ${conversations.createdAt} < now() - interval '90 days'
    returning ${conversations.id}
  `)) as Array<{ id: string }>;

  return rows.length;
}

export function maybeCleanupExpiredGuestConversations(probability = 0.01) {
  if (Math.random() >= probability) return;
  void cleanupExpiredGuestConversations().catch((error) => {
    console.warn("[retention] guest conversation cleanup failed", error);
  });
}
