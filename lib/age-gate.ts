"use client";

import { AGE_CONFIRMED_COOKIE_NAME, AGE_CONFIRMED_MAX_AGE } from "@/lib/app-cookies";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";

export type SignInProvider = "google" | "apple";

export const AGE_GATE_REQUEST_EVENT = "curator:request-signin";

export function hasConfirmedAge(): boolean {
  return readBrowserCookie(AGE_CONFIRMED_COOKIE_NAME) === "true";
}

export function markAgeConfirmed() {
  document.cookie = serializeCookie(AGE_CONFIRMED_COOKIE_NAME, "true", {
    maxAge: AGE_CONFIRMED_MAX_AGE,
  });
}

/**
 * Every "Sign in with Google/Apple" entry point in the app calls this
 * instead of the native sign-in helpers directly. AgeGateDialog (mounted
 * once, globally, in Providers.tsx) owns the actual OAuth call: if age is
 * already confirmed it proceeds immediately, otherwise it shows the gate
 * first and only proceeds if the user confirms they're 13+.
 */
export function requestSignIn(provider: SignInProvider) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ provider: SignInProvider }>(AGE_GATE_REQUEST_EVENT, {
    detail: { provider },
  }));
}
