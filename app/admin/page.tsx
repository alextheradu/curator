import { db } from "@/lib/db";
import { users, conversations, messages, documents, docChunks, reports } from "@/lib/db/schema";
import { eq, gte, count, sum, sql } from "drizzle-orm";
import { getCollectionInfo } from "@/lib/qdrant";
import { BarChart3, FileText, Hash, MessageSquare, Users, Zap, Flag } from "lucide-react";
import Link from "next/link";

async function fetchStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    [tu], [nu7], [nu30], [tc], [at], [tm], [m7],
    top, [pr], [td], ds, [tch],
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(conversations),
    db.select({ count: count() }).from(conversations).where(gte(conversations.updatedAt, todayStart)),
    db.select({ count: count() }).from(messages),
    db.select({ count: count() }).from(messages).where(gte(messages.createdAt, sevenDaysAgo)),
    db
      .select({ name: users.name, email: users.email, msgCount: count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(users, eq(conversations.userId, users.id))
      .groupBy(users.id, users.name, users.email)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db.select({ count: count() }).from(reports).where(eq(reports.status, "pending")),
    db.select({ count: count() }).from(documents),
    db
      .select({ scope: documents.scope, docCount: count(), totalPages: sum(documents.pageCount) })
      .from(documents)
      .groupBy(documents.scope),
    db.select({ count: count() }).from(docChunks),
  ]);

  let qdrantCount = 0;
  try {
    const info = await getCollectionInfo();
    qdrantCount = info.points_count ?? 0;
  } catch { /* not fatal */ }

  return { tu, nu7, nu30, tc, at, tm, m7, top, pr, td, ds, tch, qdrantCount };
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
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function AdminStatsPage() {
  const s = await fetchStats();

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Live metrics from the database and retrieval index.</p>
        </div>

        {s.pr.count > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <Flag className="size-4 shrink-0 text-red-500" />
            <p className="text-[13px] text-red-600 dark:text-red-400">
              <span className="font-semibold">{s.pr.count}</span> pending report{s.pr.count !== 1 ? "s" : ""} need review.
            </p>
            <Link href="/admin/reports" className="ml-auto text-[13px] font-medium text-red-500 underline-offset-2 hover:underline">
              Review →
            </Link>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Usage</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={s.tu.count} sub={`+${s.nu7.count} last 7d · +${s.nu30.count} last 30d`} icon={Users} />
            <StatCard label="Conversations" value={s.tc.count} sub={`${s.at.count} active today`} icon={MessageSquare} />
            <StatCard label="Messages" value={s.tm.count} sub={`${s.m7.count} last 7 days`} icon={Zap} />
            <StatCard label="Pending reports" value={s.pr.count} icon={Flag} />
          </div>
        </section>

        {s.top.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Top users</h2>
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
              <div className="overflow-x-auto">
                <table className="min-w-[420px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.top.map((u, i) => (
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
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Content</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Documents" value={s.td.count} icon={FileText} />
            <StatCard label="Chunks" value={s.tch.count} icon={Hash} />
            <StatCard label="Qdrant vectors" value={s.qdrantCount} icon={BarChart3} />
            {s.ds.map((row) => (
              <StatCard
                key={row.scope}
                label={row.scope === "season" ? "Season docs" : "General docs"}
                value={row.docCount}
                sub={`${row.totalPages ?? 0} pages`}
                icon={FileText}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
