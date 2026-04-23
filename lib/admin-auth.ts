import { auth } from "@/auth";
import { withSystemDbAccess } from "@/lib/db/access";
import { bannedEmails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdmin(_req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  void _req;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (email) {
    const [ban] = await withSystemDbAccess((tx) => tx
      .select({ email: bannedEmails.email })
      .from(bannedEmails)
      .where(eq(bannedEmails.email, email))
      .limit(1));
    if (ban) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  if (!session?.user?.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    ok: true,
    userId: session.user.id,
    isSuperAdmin: session.user.isSuperAdmin ?? false,
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
