"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lastSeenNewsAt";
const STORAGE_EVENT = "curator:news-seen-updated";

function parseSeenAt(value: string | null) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parsedDate = new Date(value).getTime();
  return Number.isFinite(parsedDate) ? parsedDate : null;
}

interface NewsBadgeProps {
  latestPublishedAt: string | null;
}

function getSeenAtSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseSeenAt(localStorage.getItem(STORAGE_KEY));
}

function subscribeToSeenAt(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}

export function NewsBadge({ latestPublishedAt }: NewsBadgeProps) {
  const pathname = usePathname();
  const isNewsRoute = pathname.startsWith("/news");
  const latestPublishedAtMs = latestPublishedAt ? new Date(latestPublishedAt).getTime() : null;
  const lastSeenAt = useSyncExternalStore(subscribeToSeenAt, getSeenAtSnapshot, () => null);

  useEffect(() => {
    if (!isNewsRoute || latestPublishedAtMs == null || !Number.isFinite(latestPublishedAtMs)) {
      return;
    }

    const storedSeenAt = getSeenAtSnapshot() ?? 0;
    const nextSeenAt = Math.max(storedSeenAt, latestPublishedAtMs);

    if (nextSeenAt === storedSeenAt) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, String(nextSeenAt));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, [isNewsRoute, latestPublishedAtMs]);

  const hasUnread = Boolean(
    !isNewsRoute
    && latestPublishedAtMs != null
    && Number.isFinite(latestPublishedAtMs)
    && ((lastSeenAt ?? 0) < latestPublishedAtMs)
  );

  if (!hasUnread) return null;

  return (
    <span className="ml-auto flex size-2 shrink-0 rounded-full bg-blue-400" aria-label="New posts" />
  );
}
