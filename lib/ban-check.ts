import { eq } from "drizzle-orm";
import { withSystemDbAccess } from "@/lib/db/access";
import { bannedEmails } from "@/lib/db/schema";

const BAN_CACHE_TTL_MS = 30_000;
const BAN_CACHE_MAX_ENTRIES = 5_000;

const banCache = new Map<string, { banned: boolean; expiresAt: number }>();

export async function isEmailBanned(email: string): Promise<boolean> {
  const [ban] = await withSystemDbAccess((tx) => tx
    .select({ email: bannedEmails.email })
    .from(bannedEmails)
    .where(eq(bannedEmails.email, email))
    .limit(1));

  return Boolean(ban);
}

// Middleware runs on every request; cache ban lookups briefly so a hot page
// doesn't hit the database per asset. A new ban takes effect within the TTL.
// Security-sensitive paths (sign-in, admin routes) must use isEmailBanned directly.
export async function isEmailBannedCached(email: string): Promise<boolean> {
  const now = Date.now();
  const cached = banCache.get(email);
  if (cached && cached.expiresAt > now) {
    return cached.banned;
  }

  const banned = await isEmailBanned(email);

  if (banCache.size >= BAN_CACHE_MAX_ENTRIES) {
    banCache.clear();
  }
  banCache.set(email, { banned, expiresAt: now + BAN_CACHE_TTL_MS });

  return banned;
}
