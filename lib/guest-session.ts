import { cookies } from "next/headers";
import { GUEST_SESSION_ID_COOKIE_NAME, GUEST_SESSION_MAX_AGE } from "./app-cookies";
import { deleteCookie, serializeCookie } from "./cookies";
import { randomUuid } from "./uuid";

export async function readGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_SESSION_ID_COOKIE_NAME)?.value ?? null;
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
