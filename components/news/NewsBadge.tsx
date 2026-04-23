"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lastSeenNewsAt";

interface NewsBadgeProps {
  latestPublishedAt: string | null;
}

export function NewsBadge({ latestPublishedAt }: NewsBadgeProps) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!latestPublishedAt) {
      setHasUnread(false);
      return;
    }

    if (pathname === "/news") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setHasUnread(false);
      return;
    }

    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      setHasUnread(true);
      return;
    }

    setHasUnread(new Date(latestPublishedAt).getTime() > Number(lastSeen));
  }, [latestPublishedAt, pathname]);

  if (!hasUnread) return null;

  return (
    <span className="ml-auto flex size-2 shrink-0 rounded-full bg-blue-400" aria-label="New posts" />
  );
}
