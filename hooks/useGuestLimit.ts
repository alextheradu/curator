"use client";

import { useState, useCallback } from "react";

const TOS_KEY = "curator_tos_accepted";
const GUEST_COUNT_KEY = "curator_guest_count";
const GUEST_LIMIT = 1;

function initializeTosState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOS_KEY) === "true";
}

function initializeGuestCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
}

function initializeShowTosModal(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOS_KEY) !== "true";
}

export function useGuestLimit(isAuthenticated: boolean) {
  const [tosAccepted, setTosAccepted] = useState(initializeTosState);
  const [guestCount, setGuestCount] = useState(initializeGuestCount);
  const [showTosModal, setShowTosModal] = useState(initializeShowTosModal);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const acceptTos = useCallback(() => {
    localStorage.setItem(TOS_KEY, "true");
    setTosAccepted(true);
    setShowTosModal(false);
  }, []);

  // Returns true if the message should be allowed through
  const checkBeforeSend = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (!tosAccepted) { setShowTosModal(true); return false; }
    if (guestCount >= GUEST_LIMIT) { setShowAuthModal(true); return false; }
    const next = guestCount + 1;
    setGuestCount(next);
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return true;
  }, [isAuthenticated, tosAccepted, guestCount]);

  return { tosAccepted, showTosModal, showAuthModal, setShowAuthModal, acceptTos, checkBeforeSend };
}
