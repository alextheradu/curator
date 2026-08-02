import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const CONTAINER_WIDTH = {
  default: "max-w-5xl",
  wide: "max-w-[1400px]",
} as const;

export function AdminPageContainer({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: keyof typeof CONTAINER_WIDTH;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-8 px-6 py-8 sm:px-8", CONTAINER_WIDTH[width], className)}>
      {children}
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
        {description && <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
      )}
      {children}
    </section>
  );
}

export function AdminCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[1.5rem] border border-border/60 bg-card/70 shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

export function AdminStatGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ElementType;
}) {
  return (
    <AdminCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.04] text-muted-foreground">
            <Icon className="size-4" />
          </div>
        )}
      </div>
      {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
    </AdminCard>
  );
}

export function AdminFilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
        active
          ? "border-foreground/15 bg-foreground text-background"
          : "border-border/60 bg-card/70 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function AdminEmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16">
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="text-[13px] text-muted-foreground">{message}</p>
    </div>
  );
}

export function AdminTableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/72 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
