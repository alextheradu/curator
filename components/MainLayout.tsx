"use client";

import { AppSidebar } from "@/components/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  latestNewsPublishedAt: string | null;
}

export function MainLayout({ children, latestNewsPublishedAt }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <AppSidebar latestNewsPublishedAt={latestNewsPublishedAt} />
        {children}
      </div>
    </SidebarProvider>
  );
}
