import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-border/60 bg-card/80 p-8 text-center shadow-[var(--shadow-float)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Offline
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          Curator needs a connection for live answers
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          You can still reopen previously cached screens, but chat, sign-in, and live FRC lookups
          need the network.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-2xl bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Try again
          </Link>
          <Link
            href="/support"
            className="inline-flex h-10 items-center rounded-2xl border border-border/60 px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Open support
          </Link>
        </div>
      </div>
    </main>
  );
}
