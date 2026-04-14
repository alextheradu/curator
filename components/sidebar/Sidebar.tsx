"use client";

import { isToday, isYesterday, subWeeks, subMonths } from "date-fns";
import { ChevronUpIcon, MessageSquareIcon, PanelLeftIcon, PenSquareIcon, Shield, TrashIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { ConversationItem } from "./ConversationItem";
import { useChatStore } from "@/lib/store";
import type { Conversation } from "@/lib/store";

function groupConversationsByDate(conversations: Conversation[]) {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return conversations.reduce(
    (groups, conv) => {
      const date = new Date(conv.updatedAt);
      if (isToday(date)) groups.today.push(conv);
      else if (isYesterday(date)) groups.yesterday.push(conv);
      else if (date > oneWeekAgo) groups.lastWeek.push(conv);
      else if (date > oneMonthAgo) groups.lastMonth.push(conv);
      else groups.older.push(conv);
      return groups;
    },
    { today: [] as Conversation[], yesterday: [] as Conversation[], lastWeek: [] as Conversation[], lastMonth: [] as Conversation[], older: [] as Conversation[] }
  );
}

function emailToHue(email: string): number {
  let hash = 0;
  for (const char of email) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

interface AppSidebarProps {
  onCreateConversation: () => void | Promise<void>;
  onOpenConversation: (id: string) => void | Promise<void>;
  onDeleteConversation: (id: string) => void | Promise<void>;
  onDeleteAllConversations: () => void | Promise<void>;
}

export function AppSidebar({
  onCreateConversation,
  onOpenConversation,
  onDeleteConversation,
  onDeleteAllConversations,
}: AppSidebarProps) {
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const {
    conversations,
    activeConversationId,
  } = useChatStore();

  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(session?.user?.email ?? "");

  const grouped = groupConversationsByDate(conversations);

  const handleDeleteAll = () => {
    setShowDeleteAllDialog(false);
    void onDeleteAllConversations();
  };

  const handleDeleteOne = (id: string) => {
    void onDeleteConversation(id);
  };

  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: grouped.today },
    { label: "Yesterday", items: grouped.yesterday },
    { label: "Last 7 days", items: grouped.lastWeek },
    { label: "Last 30 days", items: grouped.lastMonth },
    { label: "Older", items: grouped.older },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <Sidebar collapsible="icon">
        {/* Header */}
        <SidebarHeader className="pb-0 pt-3">
          <SidebarMenu>
            <SidebarMenuItem className="flex flex-row items-center justify-between">
              <div className="group/logo relative flex items-center justify-center">
                <SidebarMenuButton
                  className="size-8 !px-0 items-center justify-center group-data-[collapsible=icon]:group-hover/logo:opacity-0"
                  tooltip="Curator"
                  onClick={() => {
                    setOpenMobile(false);
                    void onCreateConversation();
                  }}
                >
                  <MessageSquareIcon className="size-4 text-sidebar-foreground/50" />
                </SidebarMenuButton>
                <button
                  type="button"
                  className="pointer-events-none absolute inset-0 flex size-8 items-center justify-center rounded-md opacity-0 group-data-[collapsible=icon]:pointer-events-auto group-data-[collapsible=icon]:group-hover/logo:opacity-100 hover:bg-sidebar-accent"
                  onClick={() => toggleSidebar()}
                  title="Open sidebar"
                >
                  <PanelLeftIcon className="size-4" />
                </button>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent>
          <SidebarGroup className="pt-1">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setOpenMobile(false);
                      void onCreateConversation();
                    }}
                    tooltip="New Chat"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">New chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {conversations.length > 0 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className="rounded-lg text-sidebar-foreground/40 transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setShowDeleteAllDialog(true)}
                      tooltip="Delete All"
                    >
                      <TrashIcon className="size-4" />
                      <span className="text-[13px]">Delete all</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* History grouped by date */}
          {conversations.length === 0 ? (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupContent>
                <div className="px-2 text-[13px] text-sidebar-foreground/50">
                  Your conversations will appear here.
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                History
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <div className="flex flex-col gap-4">
                    {groups.map((group) => (
                      <div key={group.label}>
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
                          {group.label}
                        </div>
                        {group.items.map((conv) => (
                          <SidebarMenuItem key={conv.id}>
                            <ConversationItem
                              conversation={conv}
                              isActive={conv.id === activeConversationId}
                              onClick={() => {
                                setOpenMobile(false);
                                void onOpenConversation(conv.id);
                              }}
                              onDelete={() => handleDeleteOne(conv.id)}
                            />
                          </SidebarMenuItem>
                        ))}
                      </div>
                    ))}
                  </div>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        {/* Footer — user nav */}
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-3">
          {isAdmin && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="rounded-lg text-[13px] text-sidebar-foreground/50 hover:text-sidebar-foreground"
                  onClick={() => window.location.href = "/admin/documents"}
                >
                  <Shield className="size-4" />
                  <span>Manage Documents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}

          <SidebarMenu>
            <SidebarMenuItem>
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      className="h-8 px-2 rounded-lg bg-transparent text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div
                        className="size-5 shrink-0 rounded-full ring-1 ring-sidebar-border/50"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.35 0.08 ${emailToHue(session.user.email ?? "")}), oklch(0.25 0.05 ${emailToHue(session.user.email ?? "") + 40}))`,
                        }}
                      />
                      <span className="truncate text-[13px]">{session.user.email}</span>
                      <ChevronUpIcon className="ml-auto size-3.5 text-sidebar-foreground/50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[var(--radix-popper-anchor-width)] rounded-lg border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)]"
                    side="top"
                  >
                    <DropdownMenuItem
                      className="cursor-pointer text-[13px]"
                      onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                    >
                      Toggle {resolvedTheme === "dark" ? "light" : "dark"} mode
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-[13px]"
                      onSelect={() => signOut({ callbackUrl: "/" })}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <SidebarMenuButton
                  className="h-8 rounded-lg border border-sidebar-border text-[13px] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  tooltip="Sign in"
                >
                  <span className="font-medium">Sign in with Google</span>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Delete all dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All your conversations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export { AppSidebar as Sidebar };
