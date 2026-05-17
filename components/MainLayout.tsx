"use client";

import { AppSidebar } from "@/components/sidebar/Sidebar";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NativeAuthGate } from "@/components/NativeAuthGate";

interface MainLayoutProps {
  children: React.ReactNode;
  latestNewsPublishedAt: string | null;
}

export function MainLayout({ children, latestNewsPublishedAt }: MainLayoutProps) {
  return (
    <NativeAuthGate>
      <SidebarProvider>
        <div data-capacitor-root className="flex h-svh w-full overflow-hidden overscroll-none bg-[var(--background)] text-[var(--foreground)]">
          <AppSidebar latestNewsPublishedAt={latestNewsPublishedAt} />
          <SettingsModal />
          {children}
        </div>
      </SidebarProvider>
    </NativeAuthGate>
  );
}
