"use client";

import { useEffect, useState } from "react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  conversationId: string;
  messageId: string;
  reason: string;
  source: "user_report" | "auto_moderation";
  matchedTerms: string[];
  messageRole: "user" | "assistant" | "system";
  status: string;
  accountUserId: string;
  accountEmail: string;
  accountName: string | null;
  conversationTitle: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface Props {
  report: ReportRow | null;
  onClose: () => void;
  onAction: () => void;
  onViewChat: (conversationId: string) => void;
}

export function ReportDetailModal({ report, onClose, onAction, onViewChat }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!report) { setMessages([]); return; }
    setLoading(true);
    fetch(`/api/admin/chats/${report.conversationId}`)
      .then((r) => r.json())
      .then((data: { messages?: Message[] }) => {
        const all = data.messages ?? [];
        const idx = all.findIndex((m) => m.id === report.messageId);
        const context = idx >= 0 ? all.slice(Math.max(0, idx - 3), idx + 1) : all.slice(-4);
        setMessages(context.filter((m) => m.role !== "system"));
      })
      .finally(() => setLoading(false));
  }, [report]);

  const act = async (action: "dismiss" | "delete_message" | "reviewed") => {
    if (!report) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success(
        action === "dismiss" ? "Dismissed" :
        action === "delete_message" ? "Message deleted" : "Marked reviewed"
      );
      onAction();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-sm font-semibold">
            {report?.messageRole === "user" ? "Flagged user message" : "Reported assistant reply"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Review the reported message, its surrounding context, and available moderation actions.
          </DialogDescription>
          <div className="space-y-1 text-[12px] text-muted-foreground">
            <p>
              Account <span className="text-foreground">{report?.accountName ?? report?.accountEmail}</span>
            </p>
            <p>Source: {report?.source === "auto_moderation" ? "Automatic moderation" : "User-submitted report"}</p>
            <p>Reason: {report?.reason}</p>
            {report && report.matchedTerms.length > 0 && (
              <p>Matched terms: {report.matchedTerms.join(", ")}</p>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 px-6 py-4">
          {loading && (
            <p className="text-center text-[13px] text-muted-foreground">Loading context...</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%]",
                  m.id === report?.messageId && "rounded-2xl ring-2 ring-foreground/15",
                  m.role === "user" &&
                    "rounded-2xl rounded-br-lg border border-border/50 bg-muted px-3.5 py-2.5"
                )}
              >
                {m.role === "assistant" ? (
                  <AssistantMarkdown
                    content={m.content}
                    className={cn(m.id === report?.messageId && "rounded-2xl px-1.5 py-1")}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-foreground">
                    {m.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-border/60 px-6 py-4">
          <Button
            variant="outline" size="sm" className="rounded-xl text-[13px]"
            onClick={() => { onClose(); onViewChat(report!.conversationId); }}
          >
            View full chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl text-[13px]"
            disabled={acting || report?.status === "reviewed"}
            onClick={() => act("reviewed")}
          >
            Mark reviewed
          </Button>
          <Button
            variant="outline" size="sm" className="rounded-xl text-[13px]"
            disabled={acting}
            onClick={() => act("dismiss")}
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-red-500 text-[13px] text-white hover:bg-red-600"
            disabled={acting}
            onClick={() => act("delete_message")}
          >
            Delete message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
