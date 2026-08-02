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
import {
  AdminPageContainer,
  AdminPageHeader,
  AdminSection,
  AdminStatCard,
  AdminStatGrid,
  AdminTableCard,
} from "@/components/admin/AdminShell";

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

export default async function AdminStatsPage() {
  const s = await getAdminStats();
  const totalReports = s.pendingReports.count + s.reviewedReports.count + s.dismissedReports.count;
  const vectorDelta = s.qdrantCount - s.totalChunks.count;
  const docsCoverage = s.totalDocs.count
    ? Math.round((s.docsWithDescriptions.count / s.totalDocs.count) * 100)
    : 0;

  return (
    <AdminPageContainer width="wide">
      <AdminPageHeader title="System metrics" description="Live database, moderation, and retrieval health." />

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

      <AdminSection title="Audience">
        <AdminStatGrid className="xl:grid-cols-6">
          <AdminStatCard label="Total users" value={s.totalUsers.count} sub={`+${s.newUsers1d.count} 24h · +${s.newUsers7d.count} 7d`} icon={Users} />
          <AdminStatCard label="New users (30d)" value={s.newUsers30d.count} icon={UserPlus} />
          <AdminStatCard label="Admins" value={s.adminUsers.count} icon={Shield} />
          <AdminStatCard label="Verified emails" value={s.verifiedUsers.count} icon={BadgeCheck} />
          <AdminStatCard label="User bans" value={s.bannedUsers.count} icon={ShieldAlert} />
          <AdminStatCard label="Blocked emails" value={s.blockedEmails.count} icon={Ban} />
        </AdminStatGrid>
      </AdminSection>

      <AdminSection title="Conversation activity">
        <AdminStatGrid className="xl:grid-cols-6">
          <AdminStatCard label="Conversations" value={s.totalConversations.count} icon={MessageSquare} />
          <AdminStatCard label="Public chats" value={s.publicConversations.count} icon={Activity} />
          <AdminStatCard label="Private chats" value={s.privateConversations.count} icon={Clock3} />
          <AdminStatCard label="New conversations (7d)" value={s.newConversations7d.count} icon={UserCheck} />
          <AdminStatCard label="Active today" value={s.activeToday.count} icon={Clock3} />
          <AdminStatCard label="Active users (7d)" value={s.activeUsers7d.count} icon={Users} />
        </AdminStatGrid>
      </AdminSection>

      <AdminSection title="Messaging">
        <AdminStatGrid>
          <AdminStatCard label="Total messages" value={s.totalMessages.count} icon={Zap} />
          <AdminStatCard label="Messages (24h)" value={s.messages1d.count} icon={Activity} />
          <AdminStatCard label="Messages (7d)" value={s.messages7d.count} icon={BarChart3} />
          <AdminStatCard label="Messages (30d)" value={s.messages30d.count} icon={Clock3} />
          <AdminStatCard label="User messages" value={s.userMessages.count} icon={Users} />
          <AdminStatCard label="Assistant messages" value={s.assistantMessages.count} icon={Zap} />
          <AdminStatCard label="Avg msgs/conversation" value={s.avgMessagesPerConversation} icon={MessageSquare} />
          <AdminStatCard label="Avg message length" value={`${s.avgMessageLength} chars`} icon={FileText} />
        </AdminStatGrid>
      </AdminSection>

      {s.topUsers.length > 0 && (
        <AdminSection title="Top users">
          <AdminTableCard>
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
          </AdminTableCard>
        </AdminSection>
      )}

      <AdminSection title="Moderation">
        <AdminStatGrid>
          <AdminStatCard label="Total reports" value={totalReports} icon={Flag} />
          <AdminStatCard label="Pending" value={s.pendingReports.count} icon={Flag} />
          <AdminStatCard label="Reviewed" value={s.reviewedReports.count} icon={BadgeCheck} />
          <AdminStatCard label="Dismissed" value={s.dismissedReports.count} icon={ShieldAlert} />
          <AdminStatCard label="Reports (7d)" value={s.reports7d.count} icon={Clock3} />
        </AdminStatGrid>
      </AdminSection>

      <AdminSection title="Content and retrieval">
        <AdminStatGrid>
          <AdminStatCard label="Documents" value={s.totalDocs.count} sub={`+${s.docs7d.count} uploaded in 7d`} icon={FileText} />
          <AdminStatCard label="Described docs" value={`${s.docsWithDescriptions.count} (${docsCoverage}%)`} icon={BadgeCheck} />
          <AdminStatCard label="Document pages" value={s.totalDocPages} icon={FileText} />
          <AdminStatCard label="Chunks" value={s.totalChunks.count} icon={Hash} />
          <AdminStatCard label="Qdrant vectors" value={s.qdrantCount} icon={BarChart3} />
          <AdminStatCard
            label="Vector delta"
            value={vectorDelta}
            sub={vectorDelta === 0 ? "In sync with chunks" : "Difference: vectors - chunks"}
            icon={Database}
          />
          {s.docsByScope.map((row) => (
            <AdminStatCard
              key={row.scope}
              label={row.scope === "season" ? "Season docs" : "General docs"}
              value={row.docCount}
              sub={`${toNumber(row.totalPages)} pages`}
              icon={FileText}
            />
          ))}
        </AdminStatGrid>
      </AdminSection>

      <AdminSection title="Authentication">
        <AdminStatGrid className="xl:grid-cols-3">
          <AdminStatCard label="OAuth accounts" value={s.totalAccounts.count} icon={KeyRound} />
          <AdminStatCard label="Stored sessions" value={s.totalSessions.count} icon={Clock3} />
          <AdminStatCard label="Active sessions" value={s.activeSessions.count} icon={UserCheck} />
        </AdminStatGrid>

        {s.accountProviders.length > 0 && (
          <AdminTableCard>
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
          </AdminTableCard>
        )}
      </AdminSection>
    </AdminPageContainer>
  );
}
