import { auth } from "@/auth";
import { withSystemDbAccess } from "@/lib/db/access";
import { isAdminEmail } from "@/lib/admin-emails";
import { bannedEmails, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

function isMutatingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function getAllowedOrigin(req: NextRequest) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.AUTH_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return req.nextUrl.origin;
    }
  }

  return req.nextUrl.origin;
}

function hasValidMutationOrigin(req: NextRequest) {
  if (!isMutatingMethod(req.method)) return true;
  const origin = req.headers.get("origin");
  return origin === getAllowedOrigin(req);
}

export async function requireAdmin(_req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  if (!hasValidMutationOrigin(_req)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

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
