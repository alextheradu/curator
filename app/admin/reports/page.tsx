"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Search } from "lucide-react";
import { ReportDetailModal } from "@/components/admin/ReportDetailModal";
import { ChatViewerModal } from "@/components/admin/ChatViewerModal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ReportRow {
  id: string;
  conversationId: string;
  messageId: string;
  reason: string;
  source: "user_report" | "auto_moderation";
  matchedTerms: string[];
  messageRole: "user" | "assistant" | "system";
  status: "pending" | "reviewed" | "dismissed";
  accountUserId: string;
  accountEmail: string;
  accountName: string | null;
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
  const [sourceFilter, setSourceFilter] = useState<"all" | "user_report" | "auto_moderation">("all");
  const [search, setSearch] = useState("");

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
  const automaticFlags = allReports.filter((r) => r.source === "auto_moderation").length;
  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allReports.filter((report) => {
      if (filter !== "all" && report.status !== filter) {
        return false;
      }

      if (sourceFilter !== "all" && report.source !== sourceFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        report.conversationTitle,
        report.accountName ?? "",
        report.accountEmail,
        report.reason,
        report.matchedTerms.join(" "),
      ].some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [allReports, filter, search, sourceFilter]);

  return (
    <div className="min-h-svh bg-transparent">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Admin panel
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="text-[13px] leading-6 text-muted-foreground">
            Review manual reports and automatic moderation flags in one queue, with the affected account and trigger details visible up front.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pending</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{pending}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Automatic flags</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{automaticFlags}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Loaded</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{allReports.length}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-card/70 p-3 shadow-[var(--shadow-card)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-[1rem] border-white/6 bg-background/45 pl-8 text-[13px]"
              placeholder="Search account, chat, reason, or matched terms..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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

          <div className="flex flex-wrap gap-2">
            {(["all", "auto_moderation", "user_report"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSourceFilter(value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                  sourceFilter === value
                    ? "border-foreground/15 bg-foreground text-background"
                    : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {value === "all" ? "All sources" : value === "auto_moderation" ? "Automatic" : "User reports"}
              </button>
            ))}
          </div>
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
                      {report.accountName ?? report.accountEmail} · {report.accountEmail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        report.source === "auto_moderation"
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-sky-500/10 text-sky-500",
                      )}
                    >
                      {report.source === "auto_moderation" ? "Automatic flag" : "User report"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {report.messageRole === "user" ? "User message" : "Assistant reply"}
                    </span>
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
                {report.matchedTerms.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {report.matchedTerms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                )}
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
