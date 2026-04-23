"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lastSeenNewsAt";

interface NewsBadgeProps {
  latestPublishedAt: string | null;
}

export function NewsBadge({ latestPublishedAt }: NewsBadgeProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/news") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    }
  }, [pathname]);

  const hasUnread = useMemo(() => {
    if (!latestPublishedAt || pathname === "/news" || typeof window === "undefined") {
      return false;
    }

    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      return true;
    }

    return new Date(latestPublishedAt).getTime() > Number(lastSeen);
  }, [latestPublishedAt, pathname]);

  if (!hasUnread) return null;

  return (
    <span className="ml-auto flex size-2 shrink-0 rounded-full bg-blue-400" aria-label="New posts" />
  );
}
