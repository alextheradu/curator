"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { isToday, isYesterday, subWeeks, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FolderPlusIcon,
  MessageCircleIcon,
  NewspaperIcon,
  PanelLeftIcon,
  PenSquareIcon,
  SearchIcon,
  Settings,
  XIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { nativeGoogleSignIn } from "@/lib/native-auth";
import { NewsBadge } from "@/components/news/NewsBadge";
import { useSidebarActions } from "@/hooks/useSidebarActions";
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { ProjectDialog } from "./ProjectDialog";
import { ProjectRow } from "./ProjectRow";
import { deriveProjectSidebar } from "@/lib/sidebar-projects";
import { useChatStore } from "@/lib/store";
import type { Conversation } from "@/lib/store";
import type { Project } from "@/lib/projects";

function getConversationDescription(conversation: Conversation) {
  if (conversation.searchDescription?.trim()) {
    return conversation.searchDescription.trim();
  }

  const firstRealMessage = conversation.messages.find((message) => message.role !== "system");
  if (!firstRealMessage) {
    return "No messages yet";
  }

  return firstRealMessage.content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

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

function stringToHue(value: string): number {
  let hash = 0;
  for (const char of value) hash = char.charCodeAt(0) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

interface AppSidebarProps {
  latestNewsPublishedAt: string | null;
}

export function AppSidebar({ latestNewsPublishedAt }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    createConversation,
    openConversation,
    renameConversation,
    shareConversation,
    deleteConversation,
    createProject,
    updateProject,
    deleteProject: deleteProjectAction,
    moveConversationToProject,
  } = useSidebarActions();
  const { data: session, status } = useSession();
  const isSessionLoading = status === "loading";
  const canUseProjects = Boolean(session?.user);
  const userLabel = session?.user?.preferredName?.trim() || session?.user?.name?.trim() || session?.user?.email || "Signed in";
  const avatarHueSource = session?.user?.preferredName?.trim() || session?.user?.name?.trim() || session?.user?.email || "";
  const avatarUrl = session?.user?.image?.trim() || "";
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogVersion, setProjectDialogVersion] = useState(0);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const {
    projects,
    conversations,
    activeConversationId,
    setSettingsOpen,
  } = useChatStore();

  const { projects: projectSections, history } = deriveProjectSidebar(projects, conversations);
  const grouped = groupConversationsByDate(history);


  const groups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: grouped.today },
    { label: "Yesterday", items: grouped.yesterday },
    { label: "Last 7 days", items: grouped.lastWeek },
    { label: "Last 30 days", items: grouped.lastMonth },
    { label: "Older", items: grouped.older },
  ].filter((g) => g.items.length > 0);

  const toggleExpandedProject = (projectId: string) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const projectToDelete = deleteProjectId
    ? projects.find((project) => project.id === deleteProjectId) ?? null
    : null;

  const openNewProjectDialog = () => {
    setEditingProject(null);
    setProjectDialogVersion((version) => version + 1);
    setProjectDialogOpen(true);
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setProjectDialogVersion((version) => version + 1);
    setProjectDialogOpen(true);
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.title,
        getConversationDescription(conversation),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, searchQuery]);

  const searchGroups: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: groupConversationsByDate(filteredConversations).today },
    { label: "Yesterday", items: groupConversationsByDate(filteredConversations).yesterday },
    { label: "Last 7 days", items: groupConversationsByDate(filteredConversations).lastWeek },
    { label: "Last 30 days", items: groupConversationsByDate(filteredConversations).lastMonth },
    { label: "Older", items: groupConversationsByDate(filteredConversations).older },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <ProjectDialog
        key={`${editingProject?.id ?? "new"}-${projectDialogVersion}`}
        open={projectDialogOpen}
        project={editingProject}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) {
            setEditingProject(null);
          }
        }}
        onSubmit={async (payload) => {
          if (editingProject) {
            await updateProject(editingProject.id, payload);
            return;
          }

          const project = await createProject(payload);
          if (project) {
            setExpandedProjectIds((current) => new Set(current).add(project.id));
          }
        }}
      />
      <AlertDialog open={Boolean(deleteProjectId)} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete
                ? `${projectToDelete.name} will be removed. Its chats will move back to History.`
                : "This project will be removed. Its chats will move back to History."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteProjectId) {
                  void deleteProjectAction(deleteProjectId);
                }
                setDeleteProjectId(null);
              }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={searchOpen}
        onOpenChange={(open) => {
          setSearchOpen(open);
          if (!open) {
            setSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[1.6rem] border border-white/6 bg-[#2f2f2f] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,0.42)] [&>button]:hidden sm:max-h-[430px] sm:max-w-[580px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Search chats</DialogTitle>
            <DialogDescription>
              Search your existing conversations or start a new chat.
            </DialogDescription>
          </DialogHeader>
          <div className="border-b border-white/8 px-5 py-4">
            <div className="flex items-center gap-3">
              <motion.div
                className="min-w-0 flex-1 rounded-xl bg-white/[0.03]"
                initial={false}
                animate={{
                  scaleX: isSearchFocused || searchQuery ? 1 : 0.97,
                  backgroundColor:
                    isSearchFocused || searchQuery
                      ? "rgba(255,255,255,0.055)"
                      : "rgba(255,255,255,0.03)",
                }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "left center" }}
              >
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search chats..."
                  className="h-auto border-0 bg-transparent px-3 py-2 text-[16px] font-medium text-white placeholder:text-white/55 focus-visible:ring-0"
                />
              </motion.div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/8 bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/25"
                  aria-label="Close search"
                >
                  <XIcon className="size-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          <div className="max-h-[362px] overflow-y-auto px-5 py-4">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
                setOpenMobile(false);
                void createConversation();
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.08] px-3 py-2.5 text-left text-white transition-colors hover:bg-white/[0.1]"
            >
              <div className="flex size-7 items-center justify-center rounded-full text-white/95">
                <PenSquareIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-5">New chat</p>
              </div>
            </button>

            <div className="mt-4 space-y-5">
              {searchGroups.length === 0 ? (
                <div className="px-3 py-10 text-sm text-white/55">
                  No chats match that search.
                </div>
              ) : (
                searchGroups.map((group) => (
                  <div key={group.label}>
                    <p className="px-3 text-[12px] font-medium text-white/50">{group.label}</p>
                    <div className="mt-2 space-y-0.5">
                      {group.items.map((conversation) => (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQuery("");
                            setOpenMobile(false);
                            void openConversation(conversation.id);
                          }}
                          className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-white transition-colors hover:bg-white/[0.035]"
                        >
                          <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center text-white/90">
                            <MessageCircleIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium leading-5 text-white">
                              {conversation.title}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] leading-4 text-white/50">
                              {getConversationDescription(conversation)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sidebar collapsible="icon">
        {/* Header */}
        <SidebarHeader className="pb-0 pt-[max(0.75rem,env(safe-area-inset-top))] max-md:border-b max-md:border-sidebar-border/60 max-md:px-3 max-md:pb-2">
          <div className="flex items-center justify-end px-2 group-data-[collapsible=icon]:hidden">
            <SidebarTrigger className="text-sidebar-foreground/60 transition-colors duration-150 hover:text-sidebar-foreground" />
          </div>
          <div className="hidden items-center justify-center px-2 group-data-[collapsible=icon]:flex">
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => toggleSidebar()}
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <PanelLeftIcon className="size-4" />
            </button>
          </div>
        </SidebarHeader>

        {/* Content */}
        <SidebarContent className="max-md:px-2 max-md:py-2">
          <SidebarGroup className="pt-1 max-md:px-1">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-2 max-md:space-y-2.5">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-9 justify-start gap-2.5 rounded-xl border border-sidebar-border px-4 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground max-md:h-11 max-md:rounded-2xl max-md:px-3.5 max-md:text-[15px]"
                    onClick={() => {
                      setOpenMobile(false);
                      void createConversation();
                    }}
                    tooltip="New Chat"
                  >
                    <PenSquareIcon className="size-4" />
                    <span className="font-medium">New chat</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="h-9 justify-start gap-2.5 rounded-xl border border-sidebar-border px-4 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground max-md:h-11 max-md:rounded-2xl max-md:px-3.5 max-md:text-[15px]"
                    onClick={() => setSearchOpen(true)}
                    tooltip="Search chats"
                  >
                    <SearchIcon className="size-4" />
                    <span className="font-medium">Search chats</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith("/news")}
                    className="h-9 justify-start gap-2.5 rounded-xl border border-sidebar-border px-4 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/60 data-[active=true]:text-sidebar-foreground max-md:h-11 max-md:rounded-2xl max-md:px-3.5 max-md:text-[15px]"
                    tooltip="News"
                    onClick={() => {
                      setOpenMobile(false);
                      const fromId = useChatStore.getState().activeConversationId;
                      const from = fromId ? `/c/${fromId}` : "/";
                      router.push(`/news?from=${encodeURIComponent(from)}`);
                    }}
                  >
                    <NewspaperIcon className="size-4" />
                    <span className="font-medium">News</span>
                    <NewsBadge latestPublishedAt={latestNewsPublishedAt} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {!isSessionLoading && (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden max-md:px-1 max-md:pt-3">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70 max-md:h-7 max-md:px-3 max-md:text-[11px]">
                Projects
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        if (!canUseProjects) {
                          void nativeGoogleSignIn();
                          return;
                        }
                        openNewProjectDialog();
                      }}
                      className="h-8 rounded-lg px-2 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground max-md:h-10 max-md:rounded-xl max-md:px-3 max-md:text-[14px]"
                    >
                      <FolderPlusIcon className="size-4" />
                      <span>{canUseProjects ? "New project" : "Sign in for projects"}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {canUseProjects && (
                    <div className="mt-1 flex flex-col gap-1 max-md:gap-1.5">
                      {projectSections.map(({ project, conversations: projectConversations }) => (
                        <SidebarMenuItem key={project.id}>
                          <ProjectRow
                            project={project}
                            count={projectConversations.length}
                            expanded={expandedProjectIds.has(project.id)}
                            onToggle={() => toggleExpandedProject(project.id)}
                            onNewChat={() => {
                              setOpenMobile(false);
                              setExpandedProjectIds((current) => new Set(current).add(project.id));
                              void createConversation(project.id);
                            }}
                            onEdit={() => {
                              openEditProjectDialog(project);
                            }}
                            onDelete={() => setDeleteProjectId(project.id)}
                          >
                            {projectConversations.map((conv) => (
                              <SidebarMenuItem key={conv.id}>
                                <ConversationItem
                                  conversation={conv}
                                  isActive={conv.id === activeConversationId}
                                  projects={projects.filter((item) => item.id !== project.id)}
                                  onClick={() => {
                                    setOpenMobile(false);
                                    void openConversation(conv.id);
                                  }}
                                  onRename={(title) => {
                                    void renameConversation(conv.id, title);
                                  }}
                                  onShare={() => {
                                    setOpenMobile(false);
                                    void shareConversation(conv.id);
                                  }}
                                  onDelete={() => void deleteConversation(conv.id)}
                                  onMoveToProject={(projectId) => void moveConversationToProject(conv.id, projectId)}
                                  onRemoveFromProject={() => void moveConversationToProject(conv.id, null)}
                                />
                              </SidebarMenuItem>
                            ))}
                          </ProjectRow>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* History grouped by date */}
          {history.length === 0 ? (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden max-md:px-1 max-md:pt-3">
              <SidebarGroupContent>
                <div className="px-3 py-4 text-[14px] leading-5 text-sidebar-foreground/50">
                  Your conversations will appear here.
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup className="group-data-[collapsible=icon]:hidden max-md:px-1 max-md:pt-3">
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70 max-md:h-7 max-md:px-3 max-md:text-[11px]">
                History
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <div className="flex flex-col gap-4 max-md:gap-5">
                    {groups.map((group) => (
                      <div key={group.label}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50 max-md:text-[11px]">
                          {group.label}
                        </div>
                        {group.items.map((conv) => (
                          <SidebarMenuItem key={conv.id}>
                            <ConversationItem
                              conversation={conv}
                              isActive={conv.id === activeConversationId}
                              onClick={() => {
                                setOpenMobile(false);
                                void openConversation(conv.id);
                              }}
                              onRename={(title) => {
                                void renameConversation(conv.id, title);
                              }}
                              onShare={() => {
                                setOpenMobile(false);
                                void shareConversation(conv.id);
                              }}
                              onDelete={() => void deleteConversation(conv.id)}
                              projects={projects}
                              onMoveToProject={(projectId) => void moveConversationToProject(conv.id, projectId)}
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
        <SidebarFooter className="border-t border-sidebar-border pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:px-3 max-md:pt-3">
          <SidebarMenu>
            <SidebarMenuItem>
              {isSessionLoading ? (
                <div className="flex w-full items-center gap-1 group-data-[collapsible=icon]:justify-center">
                  <div className="flex h-8 flex-1 items-center gap-2 rounded-lg px-2 group-data-[collapsible=icon]:hidden">
                    <div className="size-5 shrink-0 animate-pulse rounded-full bg-sidebar-accent/70 ring-1 ring-sidebar-border/50" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-sidebar-accent/70" />
                  </div>

                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto max-md:size-10 max-md:rounded-xl"
                    title="Settings"
                    aria-label="Settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="size-4" />
                  </button>
                </div>
              ) : session?.user ? (
                <div className="flex w-full items-center gap-1 group-data-[collapsible=icon]:justify-center">
                  <SidebarMenuButton
                    className="h-8 flex-1 rounded-lg bg-transparent px-2 text-sidebar-foreground/70 transition-colors duration-150 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden max-md:h-10 max-md:rounded-xl max-md:px-3"
                  >
                    {avatarUrl && !avatarLoadFailed ? (
                      <Image
                        src={avatarUrl}
                        alt={userLabel}
                        className="size-5 shrink-0 rounded-full object-cover ring-1 ring-sidebar-border/50"
                        width={20}
                        height={20}
                        sizes="20px"
                        unoptimized
                        onError={() => setAvatarLoadFailed(true)}
                      />
                    ) : (
                      <div
                        className="size-5 shrink-0 rounded-full ring-1 ring-sidebar-border/50"
                        style={{
                          background: `linear-gradient(135deg, oklch(0.35 0.08 ${stringToHue(avatarHueSource)}), oklch(0.25 0.05 ${stringToHue(avatarHueSource) + 40}))`,
                        }}
                      />
                    )}
                    <span className="truncate text-[13px]">{userLabel}</span>
                  </SidebarMenuButton>

                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto max-md:size-10 max-md:rounded-xl"
                    title="Settings"
                    aria-label="Settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-2 group-data-[collapsible=icon]:items-center">
                  <button
                    type="button"
                    onClick={() => void nativeGoogleSignIn()}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent/30 text-[14px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:hidden max-md:h-12 max-md:rounded-2xl max-md:text-[15px]"
                  >
                    Sign in with Google
                  </button>
                  <button
                    type="button"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/50 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:mx-auto max-md:size-10 max-md:rounded-xl"
                    title="Settings"
                    aria-label="Settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings className="size-4" />
                  </button>
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>
    </>
  );
}

export { AppSidebar as Sidebar };
