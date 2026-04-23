"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, LockOpen, MessageSquare, Search, Shield, ShieldOff, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  emailBanned: boolean;
  bannedEmail: string | null;
  banReason: string | null;
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

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data);
  }, [search, filter]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const summary = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.isAdmin).length,
    banned: users.filter((user) => user.emailBanned).length,
  }), [users]);

  const handleAction = async () => {
    if (!dialog) return;
    setLoading(true);

    try {
      if (dialog.type === "delete") {
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);
        toast.success("User deleted");
      } else {
        const action = dialog.type === "promote" || dialog.type === "demote" || dialog.type === "ban" || dialog.type === "unban"
          ? dialog.type
          : undefined;

        if (!action) {
          throw new Error("Unknown action");
        }

        const res = await fetch(`/api/admin/users/${dialog.user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error((await res.json() as { error: string }).error);

        toast.success(
          dialog.type === "ban" ? "Email banned" :
          dialog.type === "unban" ? "Email ban removed" :
          dialog.type === "promote" ? "Admin granted" :
          "Admin removed",
        );
      }

      setDialog(null);
      void fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
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
            Search accounts, review activity, and manage account-level moderation. Email bans now suspend by account identity instead of network address.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Loaded</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.total}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admins</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.admins}</p>
          </div>
          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Email bans</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{summary.banned}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-border/60 bg-card/70 p-2 shadow-[var(--shadow-card)]">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-[1rem] border-white/6 bg-background/45 pl-8 text-[13px]"
              placeholder="Search users..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {(["all", "admin", "banned"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`rounded-full border px-3 py-2 text-[12px] transition-colors ${
                filter === value ? "border-foreground/10 bg-foreground text-background" : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
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
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                          <div>
                            <p className="font-medium text-foreground">{user.name ?? "—"}</p>
                            <p className="text-muted-foreground">{user.email}</p>
                          </div>
                          {user.isAdmin && (
                            <span className="rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8cc6f3]">
                              Admin
                            </span>
                          )}
                          {user.emailBanned && (
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                              Email banned
                            </span>
                          )}
                        </div>
                        {user.emailBanned && (
                          <p className="mt-1 text-[12px] text-muted-foreground">
                            {user.banReason?.trim() ? user.banReason : `Blocked email: ${user.bannedEmail ?? user.email}`}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                        {user.msgCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/chats?userId=${user.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="View chats">
                              <MessageSquare className="size-3.5" />
                            </Button>
                          </Link>
                          {user.isAdmin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              title="Revoke admin"
                              onClick={() => setDialog({ type: "demote", user })}
                            >
                              <ShieldOff className="size-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              title="Promote to admin"
                              onClick={() => setDialog({ type: "promote", user })}
                            >
                              <Shield className="size-3.5" />
                            </Button>
                          )}
                          {user.emailBanned ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              title="Remove email ban"
                              onClick={() => setDialog({ type: "unban", user })}
                            >
                              <LockOpen className="size-3.5 text-red-500" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-lg"
                              title="Ban email"
                              onClick={() => setDialog({ type: "ban", user })}
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600"
                            title="Delete user"
                            onClick={() => setDialog({ type: "delete", user })}
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

      <ConfirmDialog
        open={!!dialog}
        title={
          dialog?.type === "delete" ? `Delete ${dialog.user.name ?? dialog.user.email}?` :
          dialog?.type === "promote" ? "Promote to admin?" :
          dialog?.type === "demote" ? "Revoke admin?" :
          dialog?.type === "ban" ? "Ban this email?" :
          dialog?.type === "unban" ? "Remove email ban?" :
          ""
        }
        description={
          dialog?.type === "delete"
            ? "This permanently deletes all their conversations and messages. Cannot be undone."
            : dialog?.type === "promote"
              ? "Grant admin access on their next login."
              : dialog?.type === "demote"
                ? "Remove admin access on their next login."
                : dialog?.type === "ban"
                  ? `Suspend ${dialog.user.email} anywhere that email signs in.`
                  : dialog?.type === "unban"
                    ? `Allow ${dialog.user.email} to sign in again.`
                    : ""
        }
        confirmLabel={
          dialog?.type === "delete" ? "Delete" :
          dialog?.type === "ban" ? "Ban email" :
          dialog?.type === "unban" ? "Unban" :
          "Confirm"
        }
        destructive={dialog?.type === "delete" || dialog?.type === "ban"}
        loading={loading}
        onConfirm={handleAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
