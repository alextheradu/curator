"use client";

import { useState, useCallback } from "react";

const TOS_KEY = "curator_tos_accepted";
const GUEST_COUNT_KEY = "curator_guest_count";
const GUEST_LIMIT = 3;

function initializeTosState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TOS_KEY) === "true";
}

function initializeGuestCount(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
}

export function useGuestLimit(isAuthenticated: boolean) {
  const [tosAccepted, setTosAccepted] = useState(initializeTosState);
  const [guestCount, setGuestCount] = useState(initializeGuestCount);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const acceptTos = useCallback(() => {
    localStorage.setItem(TOS_KEY, "true");
    setTosAccepted(true);
    setShowTosModal(false);
  }, []);

  const consumeGuestTurn = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (guestCount >= GUEST_LIMIT) {
      setShowAuthModal(true);
      return false;
    }

    const next = guestCount + 1;
    setGuestCount(next);
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return true;
  }, [guestCount, isAuthenticated]);

  return {
    tosAccepted,
    showTosModal,
    setShowTosModal,
    showAuthModal,
    setShowAuthModal,
    acceptTos,
    consumeGuestTurn,
  };
}
