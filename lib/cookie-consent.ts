export {
  COOKIE_CONSENT_MAX_AGE,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
} from "@/lib/app-cookies";
import { COOKIE_CONSENT_MAX_AGE, COOKIE_CONSENT_NAME, COOKIE_CONSENT_STORAGE_KEY } from "@/lib/app-cookies";
import { deleteCookie, serializeCookie } from "@/lib/cookies";

export type CookieConsentValue = "accepted" | "necessary";
export const COOKIE_CONSENT_EVENT = "curator:cookie-consent";

export function parseCookieConsent(value?: string | null): CookieConsentValue | null {
  if (value === "accepted" || value === "necessary") {
    return value;
  }

  return null;
}

function dispatchCookieConsent(value: CookieConsentValue) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { value } }));
}

export function clearAnalyticsCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter((name) => name === "_ga" || name === "_gid" || name === "_gat" || name.startsWith("_ga_"));

  for (const name of new Set(names)) {
    document.cookie = deleteCookie(name);
  }
}

export function persistCookieConsent(value: CookieConsentValue) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
  document.cookie = serializeCookie(COOKIE_CONSENT_NAME, value, { maxAge: COOKIE_CONSENT_MAX_AGE });

  if (value === "necessary") {
    clearAnalyticsCookies();
  }

  dispatchCookieConsent(value);
}
