"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const PROBE_URL = "/api/ping";
const PROBE_INTERVAL_MS = 30_000;
const SLOW_THRESHOLD_MS = 2_000;
const RECOVER_THRESHOLD_MS = 800;
const CONSECUTIVE_SLOW_REQUIRED = 2;

export function SlowConnectionBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slowCountRef = useRef(0);

  useEffect(() => {
    async function probe() {
      if (!navigator.onLine) return;

      const start = Date.now();
      try {
        await fetch(PROBE_URL, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
        const rtt = Date.now() - start;

        if (rtt < RECOVER_THRESHOLD_MS) {
          slowCountRef.current = 0;
          setVisible(false);
        } else if (rtt >= SLOW_THRESHOLD_MS) {
          slowCountRef.current += 1;
          if (slowCountRef.current >= CONSECUTIVE_SLOW_REQUIRED) {
            setVisible(true);
          }
        }
      } catch {
        // timeout or network error — don't show slow banner (offline banner handles that)
      }
    }

    void probe();
    const id = setInterval(() => void probe(), PROBE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-3 z-[9998] -translate-x-1/2 flex items-center gap-2.5 rounded-full border border-border/60 bg-card/95 px-4 py-2 shadow-[var(--shadow-float)] backdrop-blur-sm"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
      <p className="text-xs font-medium text-foreground">
        Slow connection — chat responses may take longer
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={13} />
      </button>
    </div>
  );
}
