import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-emails";
import { isEmailBanned } from "@/lib/ban-check";
import { withSystemDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";

export type VerifiedAdmin = {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
};

/**
 * Database-backed admin check shared by requireAdmin (API routes) and
 * requireAdminPage (server-rendered admin pages). The session's isAdmin claim
 * lives in a sliding JWT and can outlive a demotion, deletion, or removal from
 * ADMIN_EMAILS, so it is only ever a pre-filter: the live users row and the
 * current ADMIN_EMAILS list decide.
 */
export async function verifyAdminSession(): Promise<VerifiedAdmin | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !session?.user?.isAdmin) return null;

  const [dbUser] = await withSystemDbAccess((tx) => tx
    .select({ email: users.email, isAdmin: users.isAdmin, emailBanned: users.emailBanned })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1));

  // A deleted account keeps a valid JWT until it expires; without a row there
  // is nothing to be an admin of.
  if (!dbUser || dbUser.emailBanned) return null;

  const email = dbUser.email.toLowerCase();
  if (await isEmailBanned(email)) return null;

  const isSuperAdmin = isAdminEmail(email);
  if (!isSuperAdmin && !dbUser.isAdmin) return null;

  return { userId, email, isSuperAdmin };
}

export async function requireAdminPage(): Promise<VerifiedAdmin> {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/");
  return admin;
}
