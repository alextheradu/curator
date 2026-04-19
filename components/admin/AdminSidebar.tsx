"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, MessageSquare, Shield, Users, Flag, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const NAV = [
  { href: "/admin", label: "Stats", icon: BarChart3, exact: true },
  { href: "/admin/documents", label: "Documents", icon: FileText, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/chats", label: "Chats", icon: MessageSquare, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, exact: false },
];

export function AdminSidebar({ pendingReports }: { pendingReports?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-svh w-56 shrink-0 flex-col border-r border-border/60 bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066B3]/10 text-[#0066B3]">
          <Shield className="size-4" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">Admin</span>
        {session?.user?.isSuperAdmin && (
          <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            super
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
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

      {/* Footer */}
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
  );
}
