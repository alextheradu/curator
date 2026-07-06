import { auth } from "@/auth";
import { isEmailBanned } from "@/lib/ban-check";
import { withSystemDbAccess } from "@/lib/db/access";
import { isAdminEmail } from "@/lib/admin-emails";
import { users } from "@/lib/db/schema";
import { hasValidMutationOrigin } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdmin(_req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  if (!hasValidMutationOrigin(_req, { requireOriginHeader: true })) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (email && await isEmailBanned(email)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  if (!session?.user?.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const userId = session.user.id;
  const isSuperAdmin = isAdminEmail(email);
  if (!isSuperAdmin) {
    const [dbUser] = await withSystemDbAccess((tx) => tx
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1));

    if (!dbUser?.isAdmin) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  return {
    ok: true,
    userId,
    isSuperAdmin,
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
