"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bug,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Flag,
  Menu,
  MessageSquare,
  Newspaper,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { readBrowserCookie, serializeCookie } from "@/lib/cookies";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const ADMIN_SIDEBAR_COLLAPSED_COOKIE = "admin_sidebar_collapsed";
const ADMIN_SIDEBAR_MAX_AGE = 60 * 60 * 24 * 30;

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: "reports";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ href: "/admin", label: "Stats", icon: BarChart3, exact: true }] },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "News", icon: Newspaper },
      { href: "/admin/documents", label: "Documents", icon: FileText },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/chats", label: "Chats", icon: MessageSquare },
    ],
  },
  {
    label: "Safety",
    items: [
      { href: "/admin/reports", label: "Reports", icon: Flag, badge: "reports" },
      { href: "/admin/feedback", label: "Feedback", icon: ThumbsUp },
    ],
  },
  { label: "System", items: [{ href: "/admin/ops", label: "Ops", icon: Bug }] },
];

function stringToHue(value: string): number {
  let hash = 0;
  for (const char of value) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function NavGroups({
  pathname,
  pendingReports,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  pendingReports?: number;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          {!collapsed && (
            <p className="px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              const badge = item.badge === "reports" ? pendingReports : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] transition-colors",
                    collapsed && "justify-center px-0",
                    active
                      ? "bg-white/[0.08] text-foreground shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                  {badge ? (
                    collapsed ? (
                      <span className="absolute right-1 top-1 size-1.5 rounded-full bg-red-500" />
                    ) : (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { data: session } = useSession();
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const label = session?.user?.name?.trim() || session?.user?.email || "Signed in";
  const avatarUrl = session?.user?.image?.trim() || "";
  const hue = stringToHue(label);

  return (
    <div className="shrink-0 space-y-2 border-t border-white/6 p-2.5">
      <Link
        href="/"
        title={collapsed ? "Back to chat" : undefined}
        className={cn(
          "flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        <ChevronLeft className="size-4 shrink-0" />
        {!collapsed && <span>Back to chat</span>}
      </Link>

      <div className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-1.5", collapsed && "justify-center px-0")}>
        {avatarUrl && !avatarLoadFailed ? (
          <Image
            src={avatarUrl}
            alt=""
            width={24}
            height={24}
            sizes="24px"
            className="size-6 shrink-0 rounded-full object-cover"
            onError={() => setAvatarLoadFailed(true)}
          />
        ) : (
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ backgroundColor: `oklch(0.55 0.1 ${hue})` }}
          >
            {label.charAt(0).toUpperCase()}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">{label}</p>
            {session?.user?.isSuperAdmin && (
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-400">Super admin</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarHeader({
  collapsed,
  onToggle,
  showToggle,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  showToggle: boolean;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2 border-b border-white/6 p-2.5", collapsed && "justify-center")}>
      <Link
        href="/admin"
        className={cn(
          "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 text-foreground transition-colors hover:bg-white/[0.04]",
          collapsed && "flex-none justify-center px-0",
        )}
      >
        <Image src="/logo.png" alt="Curator" width={22} height={22} sizes="22px" className="size-[22px] shrink-0 rounded-md object-contain" />
        {!collapsed && <span className="truncate text-[13px] font-semibold">Admin</span>}
      </Link>
      {showToggle && !collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          title="Collapse sidebar"
        >
          <ChevronsLeft className="size-4" />
        </button>
      )}
    </div>
  );
}

export function AdminSidebar({ pendingReports }: { pendingReports?: number }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => readBrowserCookie(ADMIN_SIDEBAR_COLLAPSED_COOKIE) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = serializeCookie(ADMIN_SIDEBAR_COLLAPSED_COOKIE, next ? "1" : "0", {
        maxAge: ADMIN_SIDEBAR_MAX_AGE,
      });
      return next;
    });
  };

  if (isMobile) {
    return (
      <>
        <header className="z-40 flex h-14 shrink-0 items-center gap-2 border-b border-white/6 bg-background/94 px-3 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03] text-foreground"
          >
            <Menu className="size-4" />
          </button>
          <Image src="/logo.png" alt="Curator" width={22} height={22} sizes="22px" className="size-[22px] rounded-md object-contain" />
          <span className="text-[13px] font-semibold text-foreground">Admin</span>
          {pendingReports ? (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {pendingReports > 99 ? "99+" : pendingReports}
            </span>
          ) : null}
        </header>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="flex w-72 max-w-[85vw] flex-col gap-0 border-white/6 bg-background p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Admin navigation</SheetTitle>
            </SheetHeader>
            <SidebarHeader collapsed={false} showToggle={false} />
            <NavGroups pathname={pathname} pendingReports={pendingReports} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter collapsed={false} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "z-40 flex shrink-0 flex-col border-r border-white/6 bg-background/94 transition-[width] duration-200 ease-[var(--ease-smooth)]",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} showToggle />
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mx-2.5 mt-2.5 flex h-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          title="Expand sidebar"
        >
          <ChevronsRight className="size-4" />
        </button>
      )}
      <NavGroups pathname={pathname} pendingReports={pendingReports} collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
