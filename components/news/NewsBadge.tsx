"use client";

import { useEffect } from "react";
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

  const lastSeen = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
  const hasUnread = Boolean(
    pathname !== "/news"
    && latestPublishedAt
    && (!lastSeen || new Date(latestPublishedAt).getTime() > Number(lastSeen))
  );

  if (!hasUnread) return null;

  return (
    <span className="ml-auto flex size-2 shrink-0 rounded-full bg-blue-400" aria-label="New posts" />
  );
}
