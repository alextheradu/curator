import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function requireAdmin(req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  const ip = getClientIp(req);

  if (ip !== "unknown") {
    const [ban] = await db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);
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

export async function requireAuth(req: NextRequest): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: session.user.id };
}
