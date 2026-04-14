import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function HomePage() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-svh w-full overflow-hidden bg-[#0f0f0f]">
        <AppSidebar />
        <ChatWindow />
      </div>
    </SidebarProvider>
  );
}
