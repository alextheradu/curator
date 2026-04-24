"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bug, ChevronLeft, FileText, Flag, MessageSquare, Newspaper, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const NAV = [
  { href: "/admin", label: "Stats", icon: BarChart3, exact: true },
  { href: "/admin/blog", label: "News", icon: Newspaper, exact: false },
  { href: "/admin/documents", label: "Documents", icon: FileText, exact: false },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/chats", label: "Chats", icon: MessageSquare, exact: false },
  { href: "/admin/reports", label: "Reports", icon: Flag, exact: false },
  { href: "/admin/ops", label: "Ops", icon: Bug, exact: false },
];

function AdminNavLinks({
  pathname,
  pendingReports,
}: {
  pathname: string;
  pendingReports?: number;
}) {
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 py-1">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] transition-colors",
              active
                ? "border-white/8 bg-white/[0.08] text-foreground shadow-[var(--shadow-card)]"
                : "border-transparent text-muted-foreground hover:border-white/6 hover:bg-white/[0.04] hover:text-foreground",
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

  return (
    <header className="z-40 shrink-0 border-b border-white/6 bg-[#0f0f0f]/94 px-3 py-2 backdrop-blur-xl sm:px-4">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3">
        <Link
          href="/admin"
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <Image
            src="/logo.png"
            alt="Curator"
            width={26}
            height={26}
            className="h-6 w-6 rounded-lg object-contain"
          />
          <span className="hidden text-[13px] font-semibold sm:inline">Admin</span>
        </Link>

        <AdminNavLinks pathname={pathname} pendingReports={pendingReports} />

        {session?.user?.isSuperAdmin ? (
          <span className="hidden shrink-0 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 lg:inline-flex">
            super
          </span>
        ) : null}

        <Link
          href="/"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.03] px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Chat</span>
        </Link>
      </div>
    </header>
  );
}
