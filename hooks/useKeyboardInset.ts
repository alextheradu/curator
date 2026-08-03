"use client";

import { useEffect, useState } from "react";

function readKeyboardHeight() {
  if (typeof document === "undefined") return 0;
  const raw = document.documentElement.style.getPropertyValue("--keyboard-height");
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Live px height of the on-screen keyboard, mirroring the --keyboard-height
// signal CapacitorKeyboard (Providers.tsx) writes to the root element.
// Overlays anchored near the composer (e.g. the options menu) read this to
// keep their collision boundary aware of the keyboard-occluded region,
// since window.innerHeight doesn't shrink in a WKWebView when the keyboard
// opens - only the visual viewport does.
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => setInset(readKeyboardHeight());
    sync();

    // MutationObserver catches the --keyboard-height write itself, ahead of
    // the 250ms CSS transition that animates the composer into place.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);

    return () => {
      observer.disconnect();
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
    };
  }, []);

  return inset;
}
