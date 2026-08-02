"use client";

import { useState, useCallback } from "react";
import {
  GUEST_MESSAGE_LIMIT,
  TOS_ACCEPTED_COOKIE_NAME,
} from "@/lib/app-cookies";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";
import { isLegalAcceptanceCurrent } from "@/lib/legal";

const GUEST_MESSAGE_COUNT_STORAGE_KEY = "curator:guest-message-count";

function initializeTosState(): boolean {
  // Cookie value is an ISO timestamp of when the guest accepted, not a
  // plain boolean, so an update to the Terms/Privacy Policy after that
  // point re-gates them until they accept again.
  return isLegalAcceptanceCurrent(readBrowserCookie(TOS_ACCEPTED_COOKIE_NAME));
}

function initializeHadPriorTosAcceptance(): boolean {
  return readBrowserCookie(TOS_ACCEPTED_COOKIE_NAME) != null;
}

function initializeGuestCount(): number {
  if (typeof localStorage === "undefined") return 0;
  const parsed = Number.parseInt(localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY) ?? "0", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useGuestLimit(
  isAuthenticated: boolean,
  accountTosAccepted: boolean,
  accountHadPriorTosAcceptance: boolean,
) {
  const [guestTosAccepted, setGuestTosAccepted] = useState(initializeTosState);
  const [guestHadPriorTosAcceptance] = useState(initializeHadPriorTosAcceptance);
  const [guestCount, setGuestCount] = useState(initializeGuestCount);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const tosAccepted = isAuthenticated ? accountTosAccepted : guestTosAccepted;
  const isTosUpdate = isAuthenticated
    ? accountHadPriorTosAcceptance && !accountTosAccepted
    : guestHadPriorTosAcceptance && !guestTosAccepted;

  const acceptGuestTos = useCallback(() => {
    document.cookie = serializeCookie(TOS_ACCEPTED_COOKIE_NAME, new Date().toISOString());
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
    isTosUpdate,
    showTosModal,
    setShowTosModal,
    showAuthModal,
    setShowAuthModal,
    acceptGuestTos,
    consumeGuestTurn,
  };
}
