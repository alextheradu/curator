"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RotateCcwIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchDeletedConversations, type DeletedConversationRecord } from "@/lib/conversation-api";
import { useSidebarActions } from "@/hooks/useSidebarActions";

// Keep in sync with CONVERSATION_TRASH_RETENTION_DAYS in lib/retention.ts -
// that file pulls in server-only DB access and can't be imported here.
const RETENTION_DAYS = 30;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecentlyDeletedDialog({ open, onOpenChange }: Props) {
  const { restoreConversation, permanentlyDeleteConversation } = useSidebarActions();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DeletedConversationRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchDeletedConversations();
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) toast.error("Unable to load recently deleted chats.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRestore = async (id: string) => {
    setBusyId(id);
    const ok = await restoreConversation(id);
    setBusyId(null);
    if (ok) {
      setRows((current) => current.filter((row) => row.id !== id));
      toast.success("Chat restored to History.");
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setBusyId(id);
    const ok = await permanentlyDeleteConversation(id);
    setBusyId(null);
    if (ok) {
      setRows((current) => current.filter((row) => row.id !== id));
      toast.success("Chat permanently deleted.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recently deleted</DialogTitle>
          <DialogDescription>
            Deleted chats stay here for {RETENTION_DAYS} days before they&apos;re permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No recently deleted chats.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Deleted {formatDistanceToNow(new Date(row.deletedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Restore chat"
                    title="Restore"
                    disabled={busyId === row.id}
                    onClick={() => void handleRestore(row.id)}
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    <RotateCcwIcon className="size-4" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        aria-label="Delete forever"
                        title="Delete forever"
                        disabled={busyId === row.id}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this chat forever?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &quot;{row.title}&quot; and its messages will be permanently removed. This can&apos;t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void handlePermanentDelete(row.id)}>
                          Delete forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
