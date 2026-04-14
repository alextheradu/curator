"use client";

import { useState, useEffect, useCallback } from "react";

const TOS_KEY = "curator_tos_accepted";
const GUEST_COUNT_KEY = "curator_guest_count";
const GUEST_LIMIT = 1;

export function useGuestLimit(isAuthenticated: boolean) {
  const [tosAccepted, setTosAccepted] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(TOS_KEY) === "true";
    const count = parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
    setTosAccepted(accepted);
    setGuestCount(count);
    if (!accepted) setShowTosModal(true);
  }, []);

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
