"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, FileText, MessageSquare, Users, Flag, ChevronLeft, PanelLeftIcon, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const NAV = [
  { href: "/admin", label: "Stats", icon: BarChart3, exact: true },
  { href: "/admin/documents", label: "Documents", icon: FileText, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/chats", label: "Chats", icon: MessageSquare, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { href: "/admin/ops", label: "Ops", icon: Bug, exact: false },
];

function AdminNavLinks({
  pathname,
  pendingReports,
  onNavigate,
}: {
  pathname: string;
  pendingReports?: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-[1rem] border px-3 py-2.5 text-[13px] transition-colors",
              active
                ? "border-white/8 bg-white/[0.07] text-foreground shadow-[var(--shadow-card)]"
                : "border-transparent text-muted-foreground hover:border-white/6 hover:bg-white/[0.03] hover:text-foreground"
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
            {item.label === "Reports" && pendingReports && pendingReports > 0 ? (
              <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {pendingReports > 99 ? "99+" : pendingReports}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({ pendingReports }: { pendingReports?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/6 bg-[#0f0f0f]/94 px-3 py-3 backdrop-blur md:hidden">
        <div className="flex h-12 items-center gap-3 rounded-[1.35rem] border border-border/60 bg-card/78 px-3 shadow-[var(--shadow-card)]">
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-xl border border-white/6 bg-white/[0.03]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Curator"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Curator
              </p>
              <span className="block truncate text-[13px] font-semibold text-foreground">Admin Panel</span>
            </div>
          </div>
          {pendingReports && pendingReports > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {pendingReports > 99 ? "99+" : pendingReports}
            </span>
          ) : null}
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[20rem] max-w-[88vw] border-r border-white/6 bg-[#0f0f0f] p-3">
          <SheetHeader className="rounded-[1.5rem] border border-border/60 bg-card/78 px-4 py-4 pr-14 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Curator"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-contain"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Curator
                </p>
                <SheetTitle className="text-[13px] font-semibold">Admin Panel</SheetTitle>
              </div>
              {session?.user?.isSuperAdmin && (
                <span className="ml-auto rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  super
                </span>
              )}
            </div>
            <SheetDescription className="text-[12px] leading-5">
              Navigate between stats, documents, users, chats, reports, and operations.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[1.5rem] border border-border/60 bg-card/58 p-2 shadow-[var(--shadow-card)]">
            <AdminNavLinks pathname={pathname} pendingReports={pendingReports} onNavigate={() => setMobileOpen(false)} />

            <div className="border-t border-white/6 p-2">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-[1rem] border border-transparent px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-white/6 hover:bg-white/[0.03] hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Back to chat
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden h-svh w-[18.5rem] shrink-0 border-r border-white/6 bg-[#0f0f0f] p-4 md:flex">
        <div className="flex w-full flex-col rounded-[1.75rem] border border-border/60 bg-card/74 p-3 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.03] px-4 py-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Curator"
                width={32}
                height={32}
                className="h-8 w-8 rounded-xl object-contain"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Curator
                </p>
                <span className="block text-[14px] font-semibold text-foreground">Admin Panel</span>
              </div>
              {session?.user?.isSuperAdmin && (
                <span className="ml-auto rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  super
                </span>
              )}
            </div>
            <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
              Stats, moderation, retrieval, and support operations in the same visual system as chat.
            </p>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-[1.35rem] border border-white/6 bg-black/10">
            <div className="px-4 pb-2 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Navigation
              </p>
            </div>
            <AdminNavLinks pathname={pathname} pendingReports={pendingReports} />

            <div className="border-t border-white/6 p-2">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-[1rem] border border-transparent px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-white/6 hover:bg-white/[0.03] hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Back to chat
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
