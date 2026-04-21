"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, FileText, MessageSquare, Shield, Users, Flag, ChevronLeft, PanelLeftIcon } from "lucide-react";
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
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
              active
                ? "bg-[#0066B3]/10 text-[#0066B3]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          className="rounded-xl"
          onClick={() => setMobileOpen(true)}
          aria-label="Open admin navigation"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0066B3]/10 text-[#0066B3]">
            <Shield className="size-4" />
          </div>
          <span className="truncate text-[13px] font-semibold text-foreground">Admin Panel</span>
        </div>
        {pendingReports && pendingReports > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
            {pendingReports > 99 ? "99+" : pendingReports}
          </span>
        ) : null}
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[18rem] max-w-[85vw] border-r border-border/60 bg-card p-0">
          <SheetHeader className="border-b border-border/60 pr-14">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066B3]/10 text-[#0066B3]">
                <Shield className="size-4" />
              </div>
              <SheetTitle className="text-[13px] font-semibold">Admin Panel</SheetTitle>
              {session?.user?.isSuperAdmin && (
                <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                  super
                </span>
              )}
            </div>
            <SheetDescription className="text-[12px]">
              Navigate between stats, documents, users, chats, and reports.
            </SheetDescription>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col">
            <AdminNavLinks pathname={pathname} pendingReports={pendingReports} onNavigate={() => setMobileOpen(false)} />

            <div className="border-t border-border/60 p-2">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                Back to chat
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <aside className="hidden h-svh w-56 shrink-0 flex-col border-r border-border/60 bg-card md:flex">
        <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066B3]/10 text-[#0066B3]">
            <Shield className="size-4" />
          </div>
          <span className="text-[13px] font-semibold text-foreground">Admin Panel</span>
          {session?.user?.isSuperAdmin && (
            <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              super
            </span>
          )}
        </div>

        <AdminNavLinks pathname={pathname} pendingReports={pendingReports} />

        <div className="border-t border-border/60 p-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Back to chat
          </Link>
        </div>
      </aside>
    </>
  );
}
