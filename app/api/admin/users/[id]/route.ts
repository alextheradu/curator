import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  revalidateConversationDerivedCaches,
  revalidateReportDerivedCaches,
  revalidateUserDerivedCaches,
} from "@/lib/cache-tags";
import { isAdminEmail } from "@/lib/admin-emails";
import { withAdminDbAccess } from "@/lib/db/access";
import { db } from "@/lib/db";
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

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404, headers });

  if (isAdminEmail(target.email)) {
    return NextResponse.json({ error: "Cannot modify a superadmin" }, { status: 403, headers });
  }

  switch (body.action) {
    case "promote":
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, id));
      break;
    case "demote":
      if (!adminAuth.isSuperAdmin) {
        return NextResponse.json({ error: "Only superadmins can demote admins" }, { status: 403, headers });
      }
      await db.update(users).set({ isAdmin: false }).where(eq(users.id, id));
      break;
    case "ban": {
      const email = target.email.toLowerCase();
      await db.update(users).set({ emailBanned: true, bannedEmail: email }).where(eq(users.id, id));
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
      await db.update(users).set({ emailBanned: false, bannedEmail: null }).where(eq(users.id, id));
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400, headers });
  }

  revalidateUserDerivedCaches();
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
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

  if (isAdminEmail(target.email)) {
    return NextResponse.json({ error: "Cannot delete a superadmin" }, { status: 403, headers });
  }

  await db.delete(users).where(eq(users.id, id));
  revalidateUserDerivedCaches();
  revalidateConversationDerivedCaches();
  revalidateReportDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}
