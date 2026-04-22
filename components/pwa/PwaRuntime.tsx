"use client";

import { useEffect } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocalhost && process.env.NODE_ENV !== "production") {
      return;
    }

    const buildId = process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() || "dev";

    void navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(buildId)}`).catch((error) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
