"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  createConversation as createConversationRequest,
  createProject as createProjectRequest,
  deleteConversation as deleteConversationRequest,
  deleteProject as deleteProjectRequest,
  fetchConversation,
  fetchConversationMessages,
  updateProject as updateProjectRequest,
  updateConversation as updateConversationRequest,
} from "@/lib/conversation-api";
import { normalizeConversation, normalizeMessage } from "@/lib/conversations";
import { isProjectColorKey, isProjectIconKey, normalizeProject, type Project } from "@/lib/projects";
import { useChatStore } from "@/lib/store";

export function useSidebarActions() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;
  const {
    setActiveConversation,
    upsertConversation,
    deleteConversation,
    upsertProject,
    deleteProject,
    moveConversationToProject,
    setShareDialogConversationId,
  } = useChatStore();

  const createConversation = useCallback(async (projectId?: string | null) => {
    if (isAuthenticated && projectId) {
      try {
        const created = normalizeConversation(
          await createConversationRequest({ projectId }),
          [],
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(created);
        setActiveConversation(created.id);
        router.push(`/c/${created.id}`);
        return;
      } catch {
        toast.error("Unable to create a project chat.");
      }
    }

    setActiveConversation(null);
    router.push("/");
  }, [isAuthenticated, router, setActiveConversation, upsertConversation]);

  const openConversation = useCallback(async (conversationId: string) => {
    const localConversation = useChatStore.getState().conversations.find((conversation) => conversation.id === conversationId);

    if (localConversation) {
      setActiveConversation(conversationId);
      router.push(`/c/${conversationId}`);
    }

    try {
      if (isAuthenticated) {
        const detail = await fetchConversation(conversationId);
        if (!detail || detail.access !== "owner") {
          toast.error("Unable to open that chat.");
          return;
        }
        const messageRows = await fetchConversationMessages(conversationId);
        const conversation = normalizeConversation(
          detail.conversation,
          (messageRows ?? []).map((m) => normalizeMessage(m)),
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(conversation);
        setActiveConversation(conversation.id);
      } else {
        setActiveConversation(conversationId);
      }
      if (!localConversation) {
        router.push(`/c/${conversationId}`);
      }
    } catch {
      toast.error("Unable to open that chat.");
    }
  }, [isAuthenticated, router, setActiveConversation, upsertConversation]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    const current = useChatStore.getState().conversations.find((c) => c.id === conversationId);
    if (!current || current.title === nextTitle) return;

    upsertConversation({ ...current, title: nextTitle, updatedAt: new Date() });

    try {
      if (isAuthenticated) {
        const updated = normalizeConversation(
          await updateConversationRequest(conversationId, { title: nextTitle }),
          current.messages,
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(updated);
      }
    } catch {
      upsertConversation(current);
      toast.error("Unable to rename that chat.");
    }
  }, [isAuthenticated, upsertConversation]);

  const deleteConversationAction = useCallback(async (conversationId: string) => {
    const currentActiveId = useChatStore.getState().activeConversationId;
    const remaining = useChatStore.getState().conversations.filter((c) => c.id !== conversationId);

    try {
      if (isAuthenticated) {
        await deleteConversationRequest(conversationId);
      }
      deleteConversation(conversationId);

      if (currentActiveId === conversationId) {
        if (remaining[0]) {
          setActiveConversation(remaining[0].id);
          router.push(`/c/${remaining[0].id}`);
        } else {
          setActiveConversation(null);
          router.push("/");
        }
      }
    } catch {
      toast.error("Unable to delete that chat.");
    }
  }, [deleteConversation, isAuthenticated, router, setActiveConversation]);

  const shareConversation = useCallback(async (conversationId: string) => {
    if (!isAuthenticated) {
      toast.info("Sign in to share chats.");
      return;
    }
    try {
      const detail = await fetchConversation(conversationId);
      if (!detail || detail.access !== "owner") {
        toast.error("Unable to open that chat.");
        return;
      }
      const messageRows = await fetchConversationMessages(conversationId);
      const conversation = normalizeConversation(
        detail.conversation,
        (messageRows ?? []).map((m) => normalizeMessage(m)),
        useChatStore.getState().defaultChatMode,
      );
      upsertConversation(conversation);
      setActiveConversation(conversation.id);
      setShareDialogConversationId(conversationId);
      router.push(`/c/${conversationId}`);
    } catch {
      toast.error("Unable to open that chat.");
    }
  }, [isAuthenticated, router, setActiveConversation, setShareDialogConversationId, upsertConversation]);

  const createProject = useCallback(async (payload: { name: string; icon: string; color: string }) => {
    if (!isAuthenticated) {
      toast.info("Sign in to create projects.");
      return null;
    }

    try {
      const project = normalizeProject(await createProjectRequest(payload));
      upsertProject(project);
      return project;
    } catch {
      toast.error("Unable to create that project.");
      return null;
    }
  }, [isAuthenticated, upsertProject]);

  const updateProject = useCallback(async (projectId: string, payload: { name: string; icon: string; color: string }) => {
    const previous = useChatStore.getState().projects.find((project) => project.id === projectId);
    if (!previous) return;

    const optimistic: Project = {
      ...previous,
      name: payload.name,
      icon: isProjectIconKey(payload.icon) ? payload.icon : previous.icon,
      color: isProjectColorKey(payload.color) ? payload.color : previous.color,
      updatedAt: new Date(),
    };
    upsertProject(optimistic);

    try {
      upsertProject(normalizeProject(await updateProjectRequest(projectId, payload)));
    } catch {
      upsertProject(previous);
      toast.error("Unable to update that project.");
    }
  }, [upsertProject]);

  const deleteProjectAction = useCallback(async (projectId: string) => {
    const previousProjects = useChatStore.getState().projects;
    const previousConversations = useChatStore.getState().conversations;
    deleteProject(projectId);

    try {
      if (isAuthenticated) {
        await deleteProjectRequest(projectId);
      }
    } catch {
      useChatStore.setState({ projects: previousProjects, conversations: previousConversations });
      toast.error("Unable to delete that project.");
    }
  }, [deleteProject, isAuthenticated]);

  const moveConversationToProjectAction = useCallback(async (conversationId: string, projectId: string | null) => {
    const previous = useChatStore.getState().conversations.find((conversation) => conversation.id === conversationId);
    if (!previous) return;

    moveConversationToProject(conversationId, projectId);

    try {
      if (isAuthenticated) {
        const updated = normalizeConversation(
          await updateConversationRequest(conversationId, { projectId }),
          previous.messages,
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(updated);
      }
    } catch {
      moveConversationToProject(conversationId, previous.projectId);
      toast.error(projectId ? "Unable to move that chat." : "Unable to remove that chat from the project.");
    }
  }, [isAuthenticated, moveConversationToProject, upsertConversation]);

  return {
    createConversation,
    openConversation,
    renameConversation,
    deleteConversation: deleteConversationAction,
    shareConversation,
    createProject,
    updateProject,
    deleteProject: deleteProjectAction,
    moveConversationToProject: moveConversationToProjectAction,
  };
}
