import { getAdminStats } from "@/lib/admin-stats";
import {
  Activity,
  BadgeCheck,
  Ban,
  BarChart3,
  Clock3,
  Database,
  FileText,
  Flag,
  Hash,
  KeyRound,
  MessageSquare,
  Shield,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

function StatCard({
  label, value, sub, icon: Icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/76 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/6 bg-white/[0.04] text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function AdminStatsPage() {
  const s = await getAdminStats();
  const totalReports = s.pendingReports.count + s.reviewedReports.count + s.dismissedReports.count;
  const vectorDelta = s.qdrantCount - s.totalChunks.count;
  const docsCoverage = s.totalDocs.count
    ? Math.round((s.docsWithDescriptions.count / s.totalDocs.count) * 100)
    : 0;

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Admin overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">System metrics</h1>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            Live database, moderation, and retrieval health in the same card language as the chat workspace.
          </p>
        </div>

        {s.pendingReports.count > 0 && (
          <div className="flex items-center gap-3 rounded-[1.5rem] border border-red-500/20 bg-red-500/6 px-4 py-3 shadow-[var(--shadow-card)]">
            <Flag className="size-4 shrink-0 text-red-500" />
            <p className="text-[13px] text-red-600 dark:text-red-400">
              <span className="font-semibold">{s.pendingReports.count}</span> pending report{s.pendingReports.count !== 1 ? "s" : ""} need review.
            </p>
            <Link href="/admin/reports" className="ml-auto text-[13px] font-medium text-red-500 underline-offset-2 hover:underline">
              Review →
            </Link>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Audience</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Total users" value={s.totalUsers.count} sub={`+${s.newUsers1d.count} 24h · +${s.newUsers7d.count} 7d`} icon={Users} />
            <StatCard label="New users (30d)" value={s.newUsers30d.count} icon={UserPlus} />
            <StatCard label="Admins" value={s.adminUsers.count} icon={Shield} />
            <StatCard label="Verified emails" value={s.verifiedUsers.count} icon={BadgeCheck} />
            <StatCard label="User bans" value={s.bannedUsers.count} icon={ShieldAlert} />
            <StatCard label="Blocked IPs" value={s.blockedIps.count} icon={Ban} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Conversation activity</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Conversations" value={s.totalConversations.count} icon={MessageSquare} />
            <StatCard label="Public chats" value={s.publicConversations.count} icon={Activity} />
            <StatCard label="Private chats" value={s.privateConversations.count} icon={Clock3} />
            <StatCard label="New conversations (7d)" value={s.newConversations7d.count} icon={UserCheck} />
            <StatCard label="Active today" value={s.activeToday.count} icon={Clock3} />
            <StatCard label="Active users (7d)" value={s.activeUsers7d.count} icon={Users} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Messaging</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Total messages" value={s.totalMessages.count} icon={Zap} />
            <StatCard label="Messages (24h)" value={s.messages1d.count} icon={Activity} />
            <StatCard label="Messages (7d)" value={s.messages7d.count} icon={BarChart3} />
            <StatCard label="Messages (30d)" value={s.messages30d.count} icon={Clock3} />
            <StatCard label="User messages" value={s.userMessages.count} icon={Users} />
            <StatCard label="Assistant messages" value={s.assistantMessages.count} icon={Zap} />
            <StatCard label="Avg msgs/conversation" value={s.avgMessagesPerConversation} icon={MessageSquare} />
            <StatCard label="Avg message length" value={`${s.avgMessageLength} chars`} icon={FileText} />
          </div>
        </section>

        {s.topUsers.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Top users</h2>
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 shadow-[var(--shadow-card)]">
              <div className="overflow-x-auto">
                <table className="min-w-[420px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.topUsers.map((u, i) => (
                      <tr key={i} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-3 text-foreground">{u.name ?? u.email}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{u.msgCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Moderation</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Total reports" value={totalReports} icon={Flag} />
            <StatCard label="Pending" value={s.pendingReports.count} icon={Flag} />
            <StatCard label="Reviewed" value={s.reviewedReports.count} icon={BadgeCheck} />
            <StatCard label="Dismissed" value={s.dismissedReports.count} icon={ShieldAlert} />
            <StatCard label="Reports (7d)" value={s.reports7d.count} icon={Clock3} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Content and retrieval</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="Documents" value={s.totalDocs.count} sub={`+${s.docs7d.count} uploaded in 7d`} icon={FileText} />
            <StatCard label="Described docs" value={`${s.docsWithDescriptions.count} (${docsCoverage}%)`} icon={BadgeCheck} />
            <StatCard label="Document pages" value={s.totalDocPages} icon={FileText} />
            <StatCard label="Chunks" value={s.totalChunks.count} icon={Hash} />
            <StatCard label="Qdrant vectors" value={s.qdrantCount} icon={BarChart3} />
            <StatCard
              label="Vector delta"
              value={vectorDelta}
              sub={vectorDelta === 0 ? "In sync with chunks" : "Difference: vectors - chunks"}
              icon={Database}
            />
            {s.docsByScope.map((row) => (
              <StatCard
                key={row.scope}
                label={row.scope === "season" ? "Season docs" : "General docs"}
                value={row.docCount}
                sub={`${toNumber(row.totalPages)} pages`}
                icon={FileText}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Authentication</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            <StatCard label="OAuth accounts" value={s.totalAccounts.count} icon={KeyRound} />
            <StatCard label="Stored sessions" value={s.totalSessions.count} icon={Clock3} />
            <StatCard label="Active sessions" value={s.activeSessions.count} icon={UserCheck} />
          </div>

          {s.accountProviders.length > 0 && (
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 shadow-[var(--shadow-card)]">
              <div className="overflow-x-auto">
                <table className="min-w-[360px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Provider</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Accounts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.accountProviders.map((provider) => (
                      <tr key={provider.provider} className="border-b border-border/40 last:border-0">
                        <td className="px-5 py-3 text-foreground">{provider.provider}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{provider.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
