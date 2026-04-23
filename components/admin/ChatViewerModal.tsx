"use client";

import { useEffect, useState } from "react";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    let cancelled = false;

    if (!conversationId) {
      queueMicrotask(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setLoading(true);
      }
    });

    void fetch(`/api/admin/chats/${conversationId}`)
      .then((r) => r.json())
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  return (
    <Dialog open={!!conversationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold">{data?.title ?? "Loading..."}</DialogTitle>
          <DialogDescription className="sr-only">
            Read the messages in this conversation, including both user prompts and assistant replies.
          </DialogDescription>
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
          {!loading && data?.messages.filter((m) => m.role !== "system").length === 0 && (
            <p className="py-8 text-center text-[13px] text-muted-foreground">No messages in this chat.</p>
          )}
          {data?.messages
            .filter((m) => m.role !== "system")
            .map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%]",
                    m.role === "user" &&
                      "rounded-2xl rounded-br-lg border border-border/50 bg-muted px-3.5 py-2.5"
                  )}
                >
                  {m.role === "assistant" ? (
                    <AssistantMarkdown content={m.content} />
                  ) : (
                    <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-foreground">
                      {m.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
