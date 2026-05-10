import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { withDbAccessContext } from "@/lib/db/access";
import { appLogs } from "@/lib/db/schema";
import { ThumbsDown, ThumbsUp } from "lucide-react";

function formatTime(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getMessageId(details: unknown) {
  if (!details || typeof details !== "object" || !("messageId" in details)) {
    return "";
  }

  const messageId = (details as { messageId?: unknown }).messageId;
  return typeof messageId === "string" ? messageId : "";
}

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const rows = await withDbAccessContext(
    { userId: session.user.id, isAdmin: true },
    (tx) => tx
      .select()
      .from(appLogs)
      .where(eq(appLogs.source, "feedback"))
      .orderBy(desc(appLogs.createdAt))
      .limit(200),
  );

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.message] = (acc[row.message] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Admin panel
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Response feedback</h1>
        <p className="max-w-3xl text-[13px] leading-6 text-muted-foreground">
          Review answer quality signals from helpful, unhelpful, bad-citation, and missed-source controls.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {["helpful", "not_helpful", "bad_citation", "missed_source"].map((kind) => (
          <div key={kind} className="rounded-[1.5rem] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {kind === "helpful" ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
              {kind.replace(/_/g, " ")}
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{counts[kind] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-[1.75rem] border border-border/60 bg-card/60 p-4 shadow-[var(--shadow-card)]">
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
            No feedback yet.
          </p>
        ) : rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8cc6f3]">
                {row.message.replace(/_/g, " ")}
              </span>
              <span className="text-[12px] text-muted-foreground">{formatTime(row.createdAt)}</span>
              {row.userId ? <span className="text-[12px] text-muted-foreground">User {row.userId}</span> : null}
            </div>
            <p className="mt-3 break-all text-[12px] text-muted-foreground">
              Message ID: {getMessageId(row.details)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
