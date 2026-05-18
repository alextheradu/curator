"use client";

import { useState, useCallback } from "react";
import {
  GUEST_MESSAGE_LIMIT,
  TOS_ACCEPTED_COOKIE_NAME,
} from "@/lib/app-cookies";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";

const GUEST_MESSAGE_COUNT_STORAGE_KEY = "curator:guest-message-count";

function initializeTosState(): boolean {
  return readBrowserCookie(TOS_ACCEPTED_COOKIE_NAME) === "true";
}

function initializeGuestCount(): number {
  if (typeof localStorage === "undefined") return 0;
  const parsed = Number.parseInt(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY) ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useGuestLimit(isAuthenticated: boolean, accountTosAccepted: boolean) {
  const [guestTosAccepted, setGuestTosAccepted] = useState(initializeTosState);
  const [guestCount, setGuestCount] = useState(initializeGuestCount);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const tosAccepted = isAuthenticated ? accountTosAccepted : guestTosAccepted;

  const acceptGuestTos = useCallback(() => {
    document.cookie = serializeCookie(TOS_ACCEPTED_COOKIE_NAME, "true");
    setGuestTosAccepted(true);
    setShowTosModal(false);
  }, []);

  const consumeGuestTurn = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (guestCount >= GUEST_MESSAGE_LIMIT) {
      setShowAuthModal(true);
      return false;
    }

    const next = guestCount + 1;
    localStorage.setItem(GUEST_MESSAGE_COUNT_STORAGE_KEY, String(next));
    setGuestCount(next);
    return true;
  }, [guestCount, isAuthenticated]);

  return {
    tosAccepted,
    showTosModal,
    setShowTosModal,
    showAuthModal,
    setShowAuthModal,
    acceptGuestTos,
    consumeGuestTurn,
  };
}
