"use client";

import { useState, useCallback } from "react";
import {
  GUEST_MESSAGE_LIMIT,
  GUEST_MESSAGE_QUOTA_WINDOW_MS,
  TOS_ACCEPTED_COOKIE_NAME,
} from "@/lib/app-cookies";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";
import { isLegalAcceptanceCurrent } from "@/lib/legal";

const GUEST_MESSAGE_COUNT_STORAGE_KEY = "curator:guest-message-count";

// Mirrors the server-side rolling window (see GUEST_MESSAGE_QUOTA_WINDOW_MS):
// a plain lifetime counter would permanently wall guests off from a
// non-account-based feature, which App Store guideline 5.1.1(v) forbids.
// {count, windowStart} resets itself once 24h have elapsed since the first
// message in the current window, so a guest who hits the limit can always
// come back later and keep chatting without ever signing in.
type GuestQuotaState = { count: number; windowStart: number };

function readGuestQuotaState(): GuestQuotaState {
  if (typeof localStorage === "undefined") return { count: 0, windowStart: Date.now() };
  try {
    const raw = localStorage.getItem(GUEST_MESSAGE_COUNT_STORAGE_KEY);
    if (!raw) return { count: 0, windowStart: Date.now() };
    const parsed = JSON.parse(raw) as Partial<GuestQuotaState>;
    const windowStart = typeof parsed.windowStart === "number" ? parsed.windowStart : Date.now();
    const count = typeof parsed.count === "number" && Number.isFinite(parsed.count) ? parsed.count : 0;
    if (Date.now() - windowStart >= GUEST_MESSAGE_QUOTA_WINDOW_MS) {
      return { count: 0, windowStart: Date.now() };
    }
    return { count, windowStart };
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function writeGuestQuotaState(state: GuestQuotaState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(GUEST_MESSAGE_COUNT_STORAGE_KEY, JSON.stringify(state));
}

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
  return readGuestQuotaState().count;
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

    const current = readGuestQuotaState();
    if (current.count >= GUEST_MESSAGE_LIMIT) {
      setGuestCount(current.count);
      setShowAuthModal(true);
      return false;
    }

    const next = { count: current.count + 1, windowStart: current.windowStart };
    writeGuestQuotaState(next);
    setGuestCount(next.count);
    return true;
  }, [isAuthenticated]);

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
