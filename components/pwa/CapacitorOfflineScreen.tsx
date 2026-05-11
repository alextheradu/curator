"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export function CapacitorOfflineScreen() {
  const [offline, setOffline] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    setIsNative(true);
    setOffline(!navigator.onLine);

    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isNative || !offline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-[2rem] border border-border/60 bg-card/80 p-8 text-center shadow-[var(--shadow-float)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Offline
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Curator needs a connection for live answers
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          You're not connected to the internet. Chat, sign-in, and live FRC lookups need the
          network.
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          At competitions, try connecting to the venue guest Wi-Fi or use cellular data.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => setOffline(!navigator.onLine)}
            className="inline-flex h-10 items-center rounded-2xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
