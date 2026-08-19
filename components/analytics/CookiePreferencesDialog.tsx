"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  persistCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";
import { readBrowserCookie } from "@/lib/cookies";

type CookiePreferencesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function readConsent(): CookieConsentValue | null {
  const cookieValue = readBrowserCookie(COOKIE_CONSENT_NAME);
  return parseCookieConsent(cookieValue) ?? parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

export function CookiePreferencesDialog({ open, onOpenChange }: CookiePreferencesDialogProps) {
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
    () => readConsent(),
    () => null,
  );

  const selectedConsent = consent ?? "necessary";

  if (!hydrated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="gap-2 text-left">
            <DialogTitle className="text-xl font-semibold text-foreground">Cookie preferences</DialogTitle>
            <DialogDescription className="text-[13px] leading-6 text-muted-foreground">
              Curator uses necessary cookies for sign in, security, and core functionality. Optional analytics help us understand how Curator is used and improve the app. Analytics are not used for advertising or to track you across other companies&apos; apps or websites.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <button
            type="button"
            onClick={() => persistCookieConsent("necessary")}
            className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
              selectedConsent === "necessary"
                ? "border-foreground bg-muted"
                : "border-border/60 bg-background/50 hover:bg-muted/40"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">Necessary only</p>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              Keeps required cookies for sign-in, security, guest limits, and UI preferences. Analytics stays off.
            </p>
          </button>

          <button
            type="button"
            onClick={() => persistCookieConsent("accepted")}
            className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
              selectedConsent === "accepted"
                ? "border-foreground bg-muted"
                : "border-border/60 bg-background/50 hover:bg-muted/40"
            }`}
          >
            <p className="text-sm font-semibold text-foreground">Allow analytics</p>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              Lets us measure aggregate usage and performance trends with Google Analytics, configured to block cross-site signal sharing and ad personalization. Not used for advertising or to track you across other companies&apos; apps or websites.
            </p>
          </button>

          <p className="text-[12px] leading-5 text-muted-foreground">
            Details about each cookie live in the{" "}
            <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>.
          </p>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
