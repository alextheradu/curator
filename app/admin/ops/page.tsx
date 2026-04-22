import { desc } from "drizzle-orm";
import { Bug, Inbox, ShieldAlert } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { withDbAccessContext } from "@/lib/db/access";
import { appLogs, supportRequests } from "@/lib/db/schema";

function formatTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminOpsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const [recentSupport, recentLogs] = await withDbAccessContext(
    { userId: session.user.id, isAdmin: true },
    async (tx) => Promise.all([
      tx.select().from(supportRequests).orderBy(desc(supportRequests.createdAt)).limit(25),
      tx.select().from(appLogs).orderBy(desc(appLogs.createdAt)).limit(50),
    ]),
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin panel</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Support queue and runtime logs</h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Recent support requests and captured runtime errors live here so the operator can triage real problems without digging through process output.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card/72 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/6 bg-white/[0.04] text-[#8cc6f3]">
              <Inbox className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Support requests</h2>
              <p className="text-sm text-muted-foreground">{recentSupport.length} recent submissions</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentSupport.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                No support requests yet.
              </p>
            ) : (
              recentSupport.map((request) => (
                <div key={request.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8cc6f3]">
                      {request.subject}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {request.status}
                    </span>
                    <span className="ml-auto text-[12px] text-muted-foreground">{formatTime(request.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {request.name || "Unknown user"} {request.email ? `• ${request.email}` : ""}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{request.message}</p>
                  <p className="mt-3 text-[12px] text-muted-foreground">
                    {request.pagePath || "No page provided"} {request.ip ? `• ${request.ip}` : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card/72 p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/6 bg-white/[0.04] text-red-400">
              <Bug className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Application logs</h2>
              <p className="text-sm text-muted-foreground">{recentLogs.length} latest events</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {recentLogs.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                No app logs captured yet.
              </p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                      {log.level}
                    </span>
                    <span className="rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10 px-2.5 py-1 text-[11px] font-medium text-[#8cc6f3]">
                      {log.source}
                    </span>
                    <span className="ml-auto text-[12px] text-muted-foreground">{formatTime(log.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{log.message}</p>
                  <p className="mt-2 text-[12px] text-muted-foreground">
                    {log.path || "No path"} {log.ip ? `• ${log.ip}` : ""} {log.userId ? `• ${log.userId}` : ""}
                  </p>
                  {log.details ? (
                    <pre className="mt-3 overflow-x-auto rounded-xl border border-border/60 bg-[#111318] p-3 text-[11px] leading-5 text-muted-foreground">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/60 px-5 py-4 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldAlert className="size-4 text-[#8cc6f3]" />
          Operational note
        </div>
        <p className="mt-2">
          These logs are intentionally lightweight. They help surface support issues and uncaught client/server failures without introducing a paid monitoring dependency by default.
        </p>
      </div>
    </div>
  );
}
