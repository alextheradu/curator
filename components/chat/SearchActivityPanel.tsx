"use client";

import { SearchIcon } from "lucide-react";
import { summarizeSearchActivity, type SearchActivity } from "@/lib/search-activity";
import { cn } from "@/lib/utils";

interface Props {
  activity?: SearchActivity;
}

export function SearchActivityPanel({ activity }: Props) {
  if (!activity || activity.steps.length === 0) {
    return null;
  }

  const summary = summarizeSearchActivity(activity) || "No external sources were needed.";

  return (
    <details className="group rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground/80 [&::-webkit-details-marker]:hidden">
        <SearchIcon className="size-3.5 text-muted-foreground" />
        <span>{activity.mode === "deep" ? "Deep search" : "Balanced search"}</span>
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{summary}</span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground group-open:hidden">Details</span>
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <div className="mt-2 flex flex-col gap-1.5 border-t border-border/50 pt-2">
        {activity.steps.map((step, index) => (
          <div key={`${step.type}-${index}`} className="flex items-start gap-2">
            <span
              className={cn(
                "mt-1 size-1.5 shrink-0 rounded-full",
                step.status === "ok" && "bg-[#0066B3]",
                step.status === "empty" && "bg-muted-foreground/45",
                step.status === "limited" && "bg-amber-500",
                step.status === "error" && "bg-destructive",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-medium text-foreground/75">{step.label}</span>
                {typeof step.count === "number" ? (
                  <span>{step.count} result{step.count === 1 ? "" : "s"}</span>
                ) : null}
              </div>
              {step.query ? <p className="truncate">{step.query}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
