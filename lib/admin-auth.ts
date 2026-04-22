import { auth } from "@/auth";
import { withSystemDbAccess } from "@/lib/db/access";
import { bannedIps } from "@/lib/db/schema";
import { getClientIp } from "@/lib/request-context";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdmin(req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  const ip = getClientIp(req);

  if (ip !== "unknown") {
    const [ban] = await withSystemDbAccess((tx) => tx
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1));
    if (ban) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  const session = await auth();
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
