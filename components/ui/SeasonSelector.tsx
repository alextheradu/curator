"use client";

import { Select, MenuItem, FormControl } from "@mui/material";
import { useChatStore } from "@/lib/store";

const SEASONS = [2023, 2024, 2025];

interface Props {
  conversationId: string;
  value: number;
}

export function SeasonSelector({ conversationId, value }: Props) {
  const setSeasonYear = useChatStore((s) => s.setSeasonYear);

  return (
    <FormControl size="small" variant="outlined" sx={{ minWidth: 100 }}>
      <Select
        value={value}
        onChange={(e) => setSeasonYear(conversationId, Number(e.target.value))}
        sx={{
          fontSize: "0.75rem",
          height: "28px",
          color: "text.secondary",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1565C060" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1565C0" },
        }}
      >
        {SEASONS.map((year) => (
          <MenuItem key={year} value={year} sx={{ fontSize: "0.75rem" }}>
            {year} Season
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
