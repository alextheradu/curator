"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReportButton({ messageId, className }: { messageId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reason: reason.trim() }),
      });
      if (res.status === 401) {
        toast.info("Sign in to submit a report.");
        setOpen(false);
        return;
      }
      if (res.status === 409) { toast.info("Already reported"); setOpen(false); return; }
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      toast.success("Report submitted — thanks for the feedback");
      setOpen(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-lg p-1 text-muted-foreground/50 transition hover:bg-muted hover:text-muted-foreground",
          className
        )}
        title="Report this response"
        aria-label="Report this response"
      >
        <Flag className="size-3" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[1.75rem] border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Report response</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">
              Describe what is wrong with this assistant response so it can be reviewed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What's wrong with this response?"
            className="min-h-[100px] resize-none rounded-xl text-[13px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              disabled={loading || !reason.trim()}
              onClick={submit}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
