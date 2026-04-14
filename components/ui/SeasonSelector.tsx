"use client";

import { useChatStore } from "@/lib/store";

const SEASONS = [2026, 2025, 2024, 2023];

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
      className="h-9 min-w-[124px] rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent)]"
    >
      {SEASONS.map((year) => (
        <option key={year} value={year}>
          {year} season
        </option>
      ))}
    </select>
  );
}
