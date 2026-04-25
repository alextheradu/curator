"use client";

import { lazy, Suspense } from "react";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const SettingsModal = lazy(() =>
  import("@/components/ui/SettingsModal").then((m) => ({ default: m.SettingsModal }))
);

interface MainLayoutProps {
  children: React.ReactNode;
  latestNewsPublishedAt: string | null;
}

export function MainLayout({ children, latestNewsPublishedAt }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden overscroll-none bg-[var(--background)] text-[var(--foreground)]">
        <AppSidebar latestNewsPublishedAt={latestNewsPublishedAt} />
        <Suspense>
          <SettingsModal />
        </Suspense>
        {children}
      </div>
    </SidebarProvider>
  );
}
