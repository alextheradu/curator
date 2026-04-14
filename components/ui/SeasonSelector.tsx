"use client";

import { useChatStore } from "@/lib/store";

const SEASONS = [2023, 2024, 2025];

interface Props {
  conversationId: string;
  value: number;
}

export function SeasonSelector({ conversationId, value }: Props) {
  const setSeasonYear = useChatStore((s) => s.setSeasonYear);

  return (
    <select
      value={value}
      onChange={(e) => setSeasonYear(conversationId, Number(e.target.value))}
      className="h-7 min-w-[100px] rounded border border-border bg-background px-2 text-xs text-muted-foreground focus:border-primary focus:outline-none"
    >
      {SEASONS.map((year) => (
        <option key={year} value={year}>
          {year} Season
        </option>
      ))}
    </select>
  );
}
