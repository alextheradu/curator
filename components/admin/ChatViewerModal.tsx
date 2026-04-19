"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface Props {
  conversationId: string | null;
  onClose: () => void;
}

export function ChatViewerModal({ conversationId, onClose }: Props) {
  const [data, setData] = useState<{
    title: string;
    userName: string | null;
    userEmail: string;
    messages: Message[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/admin/chats/${conversationId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <Dialog open={!!conversationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold">{data?.title ?? "Loading..."}</DialogTitle>
          {data && (
            <p className="text-[12px] text-muted-foreground">
              {data.userName ?? data.userEmail}
            </p>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Loading...</p>
          )}
          {data?.messages
            .filter((m) => m.role !== "system")
            .map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "bg-[#0066B3] text-white"
                    : "bg-muted text-foreground"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
