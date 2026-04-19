"use client";

import { useCallback, useEffect, useState } from "react";
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

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    setAllReports(await res.json());
  }, []);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  const pending = allReports.filter((r) => r.status === "pending").length;

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {pending > 0 ? `${pending} pending` : "All caught up"}
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
          {allReports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Flag className="size-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No reports yet.</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Conversation</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {allReports.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {r.reporterName ?? r.reporterEmail}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{r.conversationTitle}</td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-muted-foreground">{r.reason}</td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        STATUS_STYLES[r.status]
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
