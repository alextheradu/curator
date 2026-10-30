import { auth } from "@/auth";
import { verifyAdminSession } from "@/lib/admin-page-auth";
import { hasValidMutationOrigin } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdmin(_req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  if (!hasValidMutationOrigin(_req, { requireOriginHeader: true })) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  // Always database-backed: the ban list, users.isAdmin and users.emailBanned
  // are re-read on every call so revoking access takes effect immediately
  // regardless of what the caller's JWT still claims.
  const admin = await verifyAdminSession();
  if (!admin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    ok: true,
    userId: admin.userId,
    isSuperAdmin: admin.isSuperAdmin,
  };
}

export async function requireAuth(): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: session.user.id };
}
