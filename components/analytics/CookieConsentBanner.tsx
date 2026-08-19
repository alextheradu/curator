"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  persistCookieConsent,
} from "@/lib/cookie-consent";
import { readBrowserCookie } from "@/lib/cookies";

export function CookieConsentBanner() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const consent = useSyncExternalStore(
    (callback) => {
      window.addEventListener(COOKIE_CONSENT_EVENT, callback);
      return () => window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
    },
    () => {
      const cookieValue = readBrowserCookie(COOKIE_CONSENT_NAME);
      const storedValue = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      return parseCookieConsent(cookieValue) ?? parseCookieConsent(storedValue);
    },
    () => null,
  );

  if (!hydrated || consent) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-4 py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-[12px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Cookie preferences</p>
          <p className="text-sm leading-6 text-foreground">
            Curator uses necessary cookies for sign in, security, and core functionality. Optional analytics help us understand how Curator is used and improve the app. Analytics are not used for advertising or to track you across other companies&apos; apps or websites, and stay off unless you allow them.
          </p>
          <p className="text-[12px] leading-5 text-muted-foreground">
            Details live in the <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              persistCookieConsent("necessary");
            }}
          >
            Necessary only
          </Button>
          <Button
            type="button"
            onClick={() => {
              persistCookieConsent("accepted");
            }}
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </div>
  );
}
