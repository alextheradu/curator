import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import {
  appLogs,
  conversations,
  supportRequests,
  users,
} from "@/lib/db/schema";
import { withSystemDbAccess } from "@/lib/db/access";
import { revalidatePublicConversation } from "@/lib/public-conversations";
import {
  revalidateConversationDerivedCaches,
  revalidateReportDerivedCaches,
  revalidateUserDerivedCaches,
} from "@/lib/cache-tags";
import { writeAdminAuditLog } from "@/lib/admin-audit";

export async function deleteUserAccountData(userId: string) {
  const ownedConversationIds = await withSystemDbAccess(async (tx) => {
    const rows = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    await tx
      .update(supportRequests)
      .set({
        name: null,
        email: null,
        subject: "[deleted account]",
        message: "[deleted account]",
        pagePath: null,
        userAgent: null,
        ip: null,
        updatedAt: new Date(),
      })
      .where(eq(supportRequests.userId, userId));

    await tx
      .update(appLogs)
      .set({
        path: null,
        ip: null,
        details: null,
        message: "[deleted account]",
      })
      .where(eq(appLogs.userId, userId));

    await tx.delete(users).where(eq(users.id, userId));

    return rows.map((row) => row.id);
  });

  // Deleting the account cascades away its conversations; expire any public
  // transcript entries so a shared link stops serving the cached copy.
  for (const conversationId of ownedConversationIds) {
    revalidatePublicConversation(conversationId);
  }

  revalidateUserDerivedCaches();
  revalidateConversationDerivedCaches();
  revalidateReportDerivedCaches();
}

export async function deleteUserAccountByAdmin(req: NextRequest, actorUserId: string, target: { id: string; email: string }) {
  await deleteUserAccountData(target.id);
  await writeAdminAuditLog(req, {
    actorUserId,
    action: "delete",
    targetType: "user",
    targetId: target.id,
    details: { targetEmail: target.email },
  });
}
