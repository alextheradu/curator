import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function HomePage() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-svh w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <AppSidebar />
        <ChatWindow />
      </div>
    </SidebarProvider>
  );
}
