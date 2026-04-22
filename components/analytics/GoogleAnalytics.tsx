"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  clearAnalyticsCookies,
  parseCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";
import { readBrowserCookie } from "@/lib/cookies";

const GOOGLE_ANALYTICS_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID?.trim();

function readConsent(): CookieConsentValue | null {
  const cookieValue = readBrowserCookie(COOKIE_CONSENT_NAME);
  return parseCookieConsent(cookieValue) ?? parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      return;
    }

    const sync = () => {
      const accepted = readConsent() === "accepted";
      const disableKey = `ga-disable-${GOOGLE_ANALYTICS_MEASUREMENT_ID}`;
      Reflect.set(window as unknown as Record<string, unknown>, disableKey, !accepted);

      const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === "function") {
        gtag("consent", "update", {
          analytics_storage: accepted ? "granted" : "denied",
        });
      }

      if (!accepted) {
        clearAnalyticsCookies();
      }

      setEnabled(accepted);
    };

    sync();
    window.addEventListener(COOKIE_CONSENT_EVENT, sync as EventListener);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync as EventListener);
  }, []);

  if (!GOOGLE_ANALYTICS_MEASUREMENT_ID || !enabled) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('consent', 'default', { analytics_storage: 'granted' });
gtag('config', '${GOOGLE_ANALYTICS_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
