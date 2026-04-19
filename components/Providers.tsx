"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ErrorToastListener } from "@/components/ui/ErrorToast";
import { TooltipProvider } from "@/components/ui/tooltip";

const ASSET_RECOVERY_KEY = "curator:asset-recovery";
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
    const attemptReload = () => {
      const now = Date.now();
      const previous = Number(sessionStorage.getItem(ASSET_RECOVERY_KEY) ?? "0");

      if (previous && now - previous < ASSET_RECOVERY_WINDOW_MS) {
        return;
      }

      sessionStorage.setItem(ASSET_RECOVERY_KEY, String(now));
      window.location.reload();
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
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error
        ? `${reason.name}: ${reason.message}`
        : String(reason ?? "");

      if (shouldReloadForAssetFailure(message)) {
        attemptReload();
      }
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
      <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
        <TooltipProvider>
          <AssetRecovery />
          <ErrorToastListener />
          {children}
          <Toaster richColors position="top-right" closeButton />
        </TooltipProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
