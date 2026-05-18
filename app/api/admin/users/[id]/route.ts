import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  revalidateUserDerivedCaches,
} from "@/lib/cache-tags";
import { validateAdminUserMutation } from "@/lib/admin-user-mutations";
import { deleteUserAccountByAdmin } from "@/lib/account-deletion";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { withAdminDbAccess } from "@/lib/db/access";
import { users, bannedEmails } from "@/lib/db/schema";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminUserMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many admin user changes. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;
  const body = await req.json() as {
    action: "promote" | "demote" | "ban" | "unban";
    reason?: string;
  };

  const [target] = await withAdminDbAccess(adminAuth.userId, (tx) => tx.select().from(users).where(eq(users.id, id)).limit(1));
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404, headers });

  const validation = validateAdminUserMutation({
    action: body.action,
    actorUserId: adminAuth.userId,
    actorIsSuperAdmin: adminAuth.isSuperAdmin,
    targetUser: target,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status, headers });
  }

  switch (body.action) {
    case "promote":
      await withAdminDbAccess(adminAuth.userId, (tx) => tx.update(users).set({ isAdmin: true }).where(eq(users.id, id)));
      break;
    case "demote":
      await withAdminDbAccess(adminAuth.userId, (tx) => tx.update(users).set({ isAdmin: false }).where(eq(users.id, id)));
      break;
    case "ban": {
      const email = target.email.toLowerCase();
      await withAdminDbAccess(adminAuth.userId, (tx) => tx
        .update(users)
        .set({ emailBanned: true, bannedEmail: email })
        .where(eq(users.id, id)));
      await withAdminDbAccess(adminAuth.userId, (tx) => tx
        .insert(bannedEmails)
        .values({ email, reason: body.reason?.trim() || null, bannedById: adminAuth.userId })
        .onConflictDoUpdate({
          target: bannedEmails.email,
          set: {
            reason: body.reason?.trim() || null,
            bannedAt: new Date(),
            bannedById: adminAuth.userId,
          },
        }));
      break;
    }
    case "unban":
      if (typeof target.bannedEmail === "string" && target.bannedEmail) {
        const bannedEmail = target.bannedEmail;
        await withAdminDbAccess(adminAuth.userId, (tx) => tx
          .delete(bannedEmails)
          .where(eq(bannedEmails.email, bannedEmail)));
      }
      await withAdminDbAccess(adminAuth.userId, (tx) => tx
        .update(users)
        .set({ emailBanned: false, bannedEmail: null })
        .where(eq(users.id, id)));
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400, headers });
  }

  revalidateUserDerivedCaches();
  await writeAdminAuditLog(req, {
    actorUserId: adminAuth.userId,
    action: body.action,
    targetType: "user",
    targetId: id,
    details: { targetEmail: target.email },
  });
  return NextResponse.json({ ok: true }, { headers });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminUserMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many admin user changes. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;
  const [target] = await withAdminDbAccess(adminAuth.userId, (tx) => tx
    .select({ id: users.id, email: users.email, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, id))
    .limit(1));
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

  const validation = validateAdminUserMutation({
    action: "delete",
    actorUserId: adminAuth.userId,
    actorIsSuperAdmin: adminAuth.isSuperAdmin,
    targetUser: target,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status, headers });
  }

  await deleteUserAccountByAdmin(req, adminAuth.userId, target);
  return NextResponse.json({ ok: true }, { headers });
}
