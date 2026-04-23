"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversationMessages,
  updateConversation as updateConversationRequest,
} from "@/lib/conversation-api";
import { normalizeConversation, normalizeMessage } from "@/lib/conversations";
import { useChatStore } from "@/lib/store";

export function useSidebarActions() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;
  const {
    setActiveConversation,
    upsertConversation,
    deleteConversation,
    setShareDialogConversationId,
  } = useChatStore();

  const createConversation = useCallback(async () => {
    setActiveConversation(null);
    router.push("/");
  }, [router, setActiveConversation]);

  const openConversation = useCallback(async (conversationId: string) => {
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
      router.push(`/c/${conversationId}`);
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

  return {
    createConversation,
    openConversation,
    renameConversation,
    deleteConversation: deleteConversationAction,
    shareConversation,
  };
}
