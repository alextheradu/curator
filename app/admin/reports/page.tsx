"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag } from "lucide-react";
import { ReportDetailModal } from "@/components/admin/ReportDetailModal";
import { ChatViewerModal } from "@/components/admin/ChatViewerModal";
import { cn } from "@/lib/utils";

interface ReportRow {
  id: string;
  conversationId: string;
  messageId: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  reporterEmail: string;
  reporterName: string | null;
  conversationTitle: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-red-500/10 text-red-500",
  reviewed: "bg-green-500/10 text-green-600 dark:text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

export default function AdminReportsPage() {
  const [allReports, setAllReports] = useState<ReportRow[]>([]);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "dismissed">("pending");

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    setAllReports(await res.json());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (!cancelled) {
        setAllReports(data);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const pending = allReports.filter((r) => r.status === "pending").length;
  const filteredReports = useMemo(() => {
    if (filter === "all") return allReports;
    return allReports.filter((report) => report.status === filter);
  }, [allReports, filter]);

  return (
    <div className="min-h-svh bg-transparent">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Admin panel
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-[13px] leading-6 text-muted-foreground">
            Review flagged assistant replies, inspect chat context, and resolve the moderation queue.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["pending", "all", "reviewed", "dismissed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                filter === value
                  ? "border-foreground/15 bg-foreground text-background"
                  : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
              )}
            >
              {value === "pending" ? `${pending} pending` : value}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-border/60 bg-card/60 p-4 shadow-[var(--shadow-card)]">
          {filteredReports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Flag className="size-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No reports in this view.</p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                className="flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-4 text-left transition-colors hover:bg-background/90"
                onClick={() => setSelected(report)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{report.conversationTitle}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      Reported by {report.reporterName ?? report.reporterEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      STATUS_STYLES[report.status]
                    )}>
                      {report.status}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p className="text-[13px] leading-6 text-muted-foreground">
                  {report.reason}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <ReportDetailModal
        report={selected}
        onClose={() => setSelected(null)}
        onAction={fetchReports}
        onViewChat={(id) => { setSelected(null); setChatId(id); }}
      />
      <ChatViewerModal conversationId={chatId} onClose={() => setChatId(null)} />
    </div>
  );
}
