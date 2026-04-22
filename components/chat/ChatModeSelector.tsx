"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatMode } from "@/lib/store";

const MODES: { value: ChatMode; label: string; description: string }[] = [
  { value: "veteran", label: "Veteran", description: "Full FRC terminology" },
  { value: "rookie", label: "Rookie", description: "Plain English, no jargon" },
];

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

export function ChatModeSelector({ mode, onChange, disabled }: Props) {
  const current = MODES.find((m) => m.value === mode) ?? MODES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/50 bg-muted/50 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
      >
        <span>{current.label}</span>
        <ChevronDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {MODES.map((m) => (
          <DropdownMenuItem
            key={m.value}
            onClick={() => onChange(m.value)}
            className="flex items-start gap-2"
          >
            <span className="mt-1 w-4 shrink-0">
              {m.value === mode && <CheckIcon className="size-4" />}
            </span>
            <div>
              <div className="text-sm font-medium">{m.label}</div>
              <div className="text-xs text-muted-foreground">{m.description}</div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
