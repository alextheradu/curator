"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Shield, ShieldOff, Ban, Trash2, MessageSquare, LockOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  ipBanned: boolean;
  bannedIp: string | null;
  createdAt: string;
  msgCount: number;
}

type DialogState =
  | { type: "promote" | "demote" | "delete" | "unban"; user: User }
  | { type: "ban"; user: User }
  | null;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "banned">("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [loading, setLoading] = useState(false);
  const [banIp, setBanIp] = useState("");
  const [banReason, setBanReason] = useState("");

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data);
  }, [search, filter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!dialog) return;
    setLoading(true);
    try {
      if (dialog.type === "delete") {
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        toast.success("User deleted");
      } else if (dialog.type === "ban") {
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "ban", ip: banIp, reason: banReason }),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        toast.success("User banned");
      } else {
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: dialog.type }),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        toast.success(`Done`);
      }
      setDialog(null);
      setBanIp("");
      setBanReason("");
      void fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Admin panel
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            Search accounts, review activity, and apply moderation actions. {users.length} total user{users.length === 1 ? "" : "s"} loaded.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-border/60 bg-card/70 p-2 shadow-[var(--shadow-card)]">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-[1rem] border-white/6 bg-background/45 pl-8 text-[13px]"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(["all", "admin", "banned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-2 text-[12px] transition-colors ${
                filter === f ? "border-foreground/10 bg-foreground text-background" : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 shadow-[var(--shadow-card)] backdrop-blur-sm">
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">Joined</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Messages</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                          <div>
                            <p className="font-medium text-foreground">{u.name ?? "—"}</p>
                            <p className="text-muted-foreground">{u.email}</p>
                          </div>
                          {u.isAdmin && (
                            <span className="rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8cc6f3]">
                              Admin
                            </span>
                          )}
                          {u.ipBanned && (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                              Banned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {u.msgCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/chats?userId=${u.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="View chats">
                              <MessageSquare className="size-3.5" />
                            </Button>
                          </Link>
                          {u.isAdmin ? (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                              title="Revoke admin"
                              onClick={() => setDialog({ type: "demote", user: u })}
                            >
                              <ShieldOff className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                              title="Promote to admin"
                              onClick={() => setDialog({ type: "promote", user: u })}
                            >
                              <Shield className="size-3.5" />
                            </Button>
                          )}
                          {u.ipBanned ? (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                              title="Unban"
                              onClick={() => setDialog({ type: "unban", user: u })}
                            >
                              <LockOpen className="size-3.5 text-red-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
                              title="IP ban"
                              onClick={() => { setBanIp(""); setBanReason(""); setDialog({ type: "ban", user: u }); }}
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600"
                            title="Delete user"
                            onClick={() => setDialog({ type: "delete", user: u })}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Ban dialog with IP + reason inputs */}
      {dialog?.type === "ban" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-float)]">
            <h2 className="text-base font-semibold text-foreground">
              Ban {dialog.user.name ?? dialog.user.email}
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Enter the IP address to ban and an optional reason.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                placeholder="IP address (e.g. 1.2.3.4)"
                value={banIp}
                onChange={(e) => setBanIp(e.target.value)}
                className="rounded-xl text-[13px]"
              />
              <Input
                placeholder="Reason (optional)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="rounded-xl text-[13px]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-red-500 text-white hover:bg-red-600"
                disabled={loading || !banIp}
                onClick={handleAction}
              >
                {loading ? "Banning..." : "Ban user"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog && dialog.type !== "ban"}
        title={
          dialog?.type === "delete" ? `Delete ${dialog?.user.name ?? dialog?.user.email}?` :
          dialog?.type === "promote" ? "Promote to admin?" :
          dialog?.type === "demote" ? "Revoke admin?" :
          dialog?.type === "unban" ? "Unban user?" : ""
        }
        description={
          dialog?.type === "delete"
            ? "This permanently deletes all their conversations and messages. Cannot be undone." :
          dialog?.type === "promote"
            ? "Grants admin access. Takes effect on their next login." :
          dialog?.type === "demote"
            ? "Removes admin access. Takes effect on their next login." :
          dialog?.type === "unban"
            ? "Removes the IP ban and allows them to access the app again." : ""
        }
        confirmLabel={
          dialog?.type === "delete" ? "Delete" :
          dialog?.type === "unban" ? "Unban" : "Confirm"
        }
        destructive={dialog?.type === "delete"}
        loading={loading}
        onConfirm={handleAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
