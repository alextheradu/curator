"use client";

import { useState, useCallback } from "react";
import {
  GUEST_MESSAGE_COUNT_COOKIE_NAME,
  GUEST_MESSAGE_LIMIT,
  TOS_ACCEPTED_COOKIE_NAME,
} from "@/lib/app-cookies";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";

function initializeTosState(): boolean {
  return readBrowserCookie(TOS_ACCEPTED_COOKIE_NAME) === "true";
}

function initializeGuestCount(): number {
  const parsed = Number.parseInt(readBrowserCookie(GUEST_MESSAGE_COUNT_COOKIE_NAME) ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useGuestLimit(isAuthenticated: boolean) {
  const [tosAccepted, setTosAccepted] = useState(initializeTosState);
  const [guestCount, setGuestCount] = useState(initializeGuestCount);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const acceptTos = useCallback(() => {
    document.cookie = serializeCookie(TOS_ACCEPTED_COOKIE_NAME, "true");
    setTosAccepted(true);
    setShowTosModal(false);
  }, []);

  const consumeGuestTurn = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (guestCount >= GUEST_MESSAGE_LIMIT) {
      setShowAuthModal(true);
      return false;
    }

    const next = guestCount + 1;
    setGuestCount(next);
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
