"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { CookieConsentBanner } from "@/components/analytics/CookieConsentBanner";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { PwaRuntime } from "@/components/pwa/PwaRuntime";
import { SlowConnectionBanner } from "@/components/pwa/SlowConnectionBanner";
import { CapacitorOfflineScreen } from "@/components/pwa/CapacitorOfflineScreen";
import { Toaster } from "@/components/ui/sonner";
import { ErrorToastListener } from "@/components/ui/ErrorToast";
import { TooltipProvider } from "@/components/ui/tooltip";

function CapacitorShell() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Capacitor" in window)) return;
    document.documentElement.classList.add("capacitor");
  }, []);
  return null;
}

// Tracks keyboard height and exposes it as --keyboard-height CSS variable.
// Runs @capacitor/keyboard events (exact UIKit height) and visual viewport in parallel —
// whichever fires wins, so it works before and after npx cap sync.
function CapacitorKeyboard() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Capacitor" in window)) return;

    const setHeight = (px: number) => {
      document.documentElement.style.setProperty("--keyboard-height", `${px}px`);
      document.documentElement.classList.toggle("keyboard-open", px > 0);
    };

    const resetScroll = () => window.scrollTo(0, 0);
    window.addEventListener("scroll", resetScroll, { passive: true });

    // Visual viewport (always available, fires if WKWebView doesn't suppress it).
    const vv = window.visualViewport;
    const sync = vv ? () => setHeight(Math.max(0, window.innerHeight - vv.height)) : null;
    if (vv && sync) vv.addEventListener("resize", sync);

    // Keyboard plugin events (more reliable — fires after npx cap sync + rebuild).
    void import("@capacitor/keyboard").then(({ Keyboard }) => {
      void Keyboard.addListener("keyboardWillShow", (info) => setHeight(info.keyboardHeight));
      void Keyboard.addListener("keyboardWillHide", () => setHeight(0));
    }).catch(() => {});

    return () => {
      if (vv && sync) vv.removeEventListener("resize", sync);
      window.removeEventListener("scroll", resetScroll);
      document.documentElement.style.removeProperty("--keyboard-height");
      void import("@capacitor/keyboard").then(({ Keyboard }) => void Keyboard.removeAllListeners()).catch(() => {});
    };
  }, []);
  return null;
}

const ASSET_RECOVERY_KEY = "curator:asset-recovery";
const ASSET_RECOVERY_PARAM = "__asset_recovery";
const ASSET_RECOVERY_WINDOW_MS = 30_000;

function shouldReloadForAssetFailure(message: string) {
  return [
    "ChunkLoadError",
    "Failed to load chunk",
    "Loading chunk",
    "/_next/static/",
  ].some((needle) => message.includes(needle));
}

function AssetRecovery() {
  useEffect(() => {
    const sendClientError = (payload: { kind: string; message: string; stack?: string; url: string }) => {
      const body = JSON.stringify(payload);

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/client-errors", body);
        return;
      }

      void fetch("/api/client-errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    };

    const clearAppCaches = async () => {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith("curator-pwa-"))
              .map((key) => caches.delete(key)),
          );
        }
      } catch {
        // Ignore cache cleanup failures and still force a reload.
      }
    };

    const attemptReload = () => {
      const now = Date.now();
      const previous = Number(sessionStorage.getItem(ASSET_RECOVERY_KEY) ?? "0");

      if (previous && now - previous < ASSET_RECOVERY_WINDOW_MS) {
        return;
      }

      sessionStorage.setItem(ASSET_RECOVERY_KEY, String(now));
      void clearAppCaches().finally(() => {
        const url = new URL(window.location.href);
        url.searchParams.set(ASSET_RECOVERY_PARAM, String(now));
        window.location.replace(url.toString());
      });
    };

    const handleWindowError = (event: ErrorEvent) => {
      const message = event.message ?? "";
      const target = event.target;

      if (typeof HTMLLinkElement !== "undefined" && target instanceof HTMLLinkElement) {
        if (target.href.includes("/_next/static/")) {
          attemptReload();
        }
        return;
      }

      if (typeof HTMLScriptElement !== "undefined" && target instanceof HTMLScriptElement) {
        if (target.src.includes("/_next/static/")) {
          attemptReload();
        }
        return;
      }

      if (shouldReloadForAssetFailure(message)) {
        attemptReload();
        sendClientError({
          kind: "asset_failure",
          message,
          url: window.location.href,
        });
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason ?? "");

      if (shouldReloadForAssetFailure(message)) {
        attemptReload();
        sendClientError({
          kind: "asset_failure",
          message,
          url: window.location.href,
        });
        return;
      }

      sendClientError({
        kind: "unhandled_rejection",
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
        url: window.location.href,
      });
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <GoogleAnalytics />
          <PwaRuntime />
          <SlowConnectionBanner />
          <CapacitorOfflineScreen />
          <CapacitorShell />
          <CapacitorKeyboard />
          <AssetRecovery />
          <ErrorToastListener />
          {children}
          <CookieConsentBanner />
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
