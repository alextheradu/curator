"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { Bot, LogIn, LogOut, Plus, Settings2, Shield } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { useChatStore } from "@/lib/store";

export function AppSidebar() {
  const { data: session } = useSession();
  const { conversations, activeConversationId, newConversation, setActiveConversation, deleteConversation, setSettingsOpen } = useChatStore();

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(session?.user?.email ?? "");

  return (
    <Sidebar variant="inset" className="border-[#2e2e2e] bg-[#1a1a1a]">
      <SidebarHeader className="border-b border-[#2e2e2e] px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ED1C24]">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8A8A8A]">FRC AI</p>
            <h1 className="text-lg font-bold uppercase tracking-wider text-white">Curator</h1>
          </div>
        </div>
        <Button
          onClick={newConversation}
          className="h-10 w-full gap-2 rounded-xl bg-[#ED1C24] text-white hover:bg-[#c9151b]"
        >
          <Plus size={15} />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-[#8A8A8A]">
            {session ? "Your chats" : "Guest chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2e2e2e] px-4 py-8 text-center text-sm text-[#8A8A8A]">
                No chats yet. Start asking about FRC rules, code, or strategy.
              </div>
            ) : (
              <SidebarMenu className="gap-1">
                <AnimatePresence initial={false}>
                  {conversations.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <ConversationItem
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onClick={() => setActiveConversation(conv.id)}
                        onDelete={() => deleteConversation(conv.id)}
                      />
                    </SidebarMenuItem>
                  ))}
                </AnimatePresence>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#2e2e2e] px-4 py-4 gap-2">
        {isAdmin && (
          <a
            href="/admin/documents"
            className="inline-flex w-full items-center justify-start gap-2 rounded-xl px-2.5 py-1 text-sm text-[#8A8A8A] transition-colors hover:bg-muted hover:text-white"
          >
            <Shield size={14} />Manage Documents
          </a>
        )}
        <Button variant="ghost" size="sm"
          className="w-full justify-start gap-2 rounded-xl text-[#8A8A8A] hover:text-white"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={14} />Settings
        </Button>

        {session ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] p-3">
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{session.user?.name}</p>
              <p className="truncate text-[10px] text-[#8A8A8A]">{session.user?.email}</p>
            </div>
            <Button variant="ghost" size="icon"
              className="h-7 w-7 shrink-0 text-[#8A8A8A] hover:text-white"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              <LogOut size={13} />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm"
            className="w-full gap-2 rounded-xl border-[#2e2e2e] bg-[#0f0f0f] text-[#8A8A8A] hover:text-white"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <LogIn size={14} />Sign in with Google
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function SidebarToggle() { return <SidebarTrigger />; }
export { AppSidebar as Sidebar };
