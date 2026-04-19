import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

function getSuperAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const { id } = await params;
  const body = await req.json() as {
    action: "promote" | "demote" | "ban" | "unban";
    reason?: string;
    ip?: string;
  };

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (target.email && getSuperAdminEmails().includes(target.email.toLowerCase())) {
    return NextResponse.json({ error: "Cannot modify a superadmin" }, { status: 403 });
  }

  switch (body.action) {
    case "promote":
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, id));
      break;
    case "demote":
      if (!adminAuth.isSuperAdmin) {
        return NextResponse.json({ error: "Only superadmins can demote admins" }, { status: 403 });
      }
      await db.update(users).set({ isAdmin: false }).where(eq(users.id, id));
      break;
    case "ban": {
      const ip = body.ip ?? "unknown";
      await db.update(users).set({ ipBanned: true, bannedIp: ip }).where(eq(users.id, id));
      if (ip !== "unknown") {
        await db
          .insert(bannedIps)
          .values({ ip, reason: body.reason ?? null, bannedById: adminAuth.userId })
          .onConflictDoNothing();
      }
      break;
    }
    case "unban":
      if (target.bannedIp) {
        await db.delete(bannedIps).where(eq(bannedIps.ip, target.bannedIp));
      }
      await db.update(users).set({ ipBanned: false, bannedIp: null }).where(eq(users.id, id));
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const { id } = await params;
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (target.email && getSuperAdminEmails().includes(target.email.toLowerCase())) {
    return NextResponse.json({ error: "Cannot delete a superadmin" }, { status: 403 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
