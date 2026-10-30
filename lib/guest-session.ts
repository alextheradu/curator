import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { GUEST_SESSION_ID_COOKIE_NAME, GUEST_SESSION_MAX_AGE } from "./app-cookies";
import { deleteCookie, serializeCookie } from "./cookies";
import { withGuestDbAccess } from "./db/access";
import { conversations } from "./db/schema";
import { isUuid, randomUuid } from "./uuid";

export async function readGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_ID_COOKIE_NAME)?.value ?? null;
}

/**
 * The guest cookie is unsigned, so its raw value must not be used as a
 * quota or identity key on its own: a client could send a fresh random value
 * per request. A guest id only counts once the server has issued it, which
 * is observable as at least one guest conversation row owned by that id.
 */
export async function readVerifiedGuestSessionId(): Promise<string | null> {
  const guestId = await readGuestSessionId();
  if (!guestId || !isUuid(guestId)) return null;

  const [owned] = await withGuestDbAccess(guestId, (tx) => tx
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.guestId, guestId))
    .limit(1));

  return owned ? guestId : null;
}

export function generateGuestSessionId(): string {
  return randomUuid();
}

export function serializeGuestSessionCookie(guestId: string): string {
  return serializeCookie(GUEST_SESSION_ID_COOKIE_NAME, guestId, {
    maxAge: GUEST_SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  });
}

export function deleteGuestSessionCookie(): string {
  return deleteCookie(GUEST_SESSION_ID_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  });
}
