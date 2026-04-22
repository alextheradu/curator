"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversationList,
  fetchConversationMessages,
  updateConversation as updateConversationRequest,
} from "@/lib/conversation-api";
import { normalizeConversation, normalizeMessage } from "@/lib/conversations";
import type { Conversation } from "@/lib/store";
import { useChatStore } from "@/lib/store";

type ViewMode = "loading" | "guest" | "owner" | "public" | "not-found";

interface ChatAppProps {
  requestedConversationId?: string;
}

function LoadingState() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-[var(--background)] text-sm text-muted-foreground">
      Loading chat…
    </div>
  );
}

function UnavailableState() {
  return (
    <div className="flex h-svh w-full items-center justify-center bg-[var(--background)] px-6">
      <div className="max-w-md rounded-3xl border border-border/60 bg-card/60 p-8 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-foreground">This chat is unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The link is invalid, the chat was deleted, or the owner has not made it public.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-xl border border-border/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Go to Curator
        </Link>
      </div>
    </div>
  );
}

export function ChatApp({ requestedConversationId }: ChatAppProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user?.id;

  const {
    defaultChatMode,
    setActiveConversation,
    setDefaultChatMode,
    deleteConversation,
    replaceConversations,
    upsertConversation,
    clearAllConversations,
  } = useChatStore();

  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [publicConversation, setPublicConversation] = useState<Conversation | null>(null);
  const [isShareUpdating, setIsShareUpdating] = useState(false);
  const [shareDialogConversationId, setShareDialogConversationId] = useState<string | null>(null);
  const previousAuthRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const accountChatMode = session?.user?.defaultChatMode ?? "veteran";
    if (defaultChatMode !== accountChatMode) {
      setDefaultChatMode(accountChatMode);
    }
  }, [defaultChatMode, isAuthenticated, session?.user?.defaultChatMode, setDefaultChatMode]);

  const navigateToConversation = useCallback((conversationId: string, replace = false) => {
    const href = `/c/${conversationId}`;
    if (replace) {
      router.replace(href);
      return;
    }

    router.push(href);
  }, [router]);

  const readConversation = useCallback(async (conversationId: string) => {
    const detail = await fetchConversation(conversationId);
    if (!detail) return null;

    const messageRows = await fetchConversationMessages(conversationId);
    if (!messageRows) return null;

    return {
      access: detail.access,
      conversation: normalizeConversation(
        detail.conversation,
        messageRows.map((message) => normalizeMessage(message)),
        useChatStore.getState().defaultChatMode,
      ),
    };
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (previousAuthRef.current && !isAuthenticated) {
      clearAllConversations();
    }
    previousAuthRef.current = isAuthenticated;

    let cancelled = false;

    const bootstrap = async () => {
      setViewMode("loading");

      if (isAuthenticated) {
        try {
          const rows = await fetchConversationList();
          if (cancelled) return;

          replaceConversations(
            rows.map((conversation) =>
              normalizeConversation(conversation, [], useChatStore.getState().defaultChatMode)
            )
          );

          if (requestedConversationId) {
            const loaded = await readConversation(requestedConversationId);
            if (cancelled) return;

            if (!loaded) {
              setPublicConversation(null);
              setViewMode("not-found");
              return;
            }

            if (loaded.access === "owner") {
              upsertConversation(loaded.conversation);
              setActiveConversation(loaded.conversation.id);
              setPublicConversation(null);
              setViewMode("owner");
              return;
            }

            setPublicConversation(loaded.conversation);
            setViewMode("public");
            return;
          }

          setActiveConversation(null);
          setPublicConversation(null);
          setViewMode("owner");
          router.replace("/");
          return;
        } catch (error) {
          if (!cancelled) {
            console.error(error);
            toast.error("Unable to load your chats.");
            setViewMode("not-found");
          }
          return;
        }
      }

      if (requestedConversationId) {
        const localConversation = useChatStore
          .getState()
          .conversations
          .find((conversation) => conversation.id === requestedConversationId);

        if (localConversation) {
          setActiveConversation(localConversation.id);
          setPublicConversation(null);
          setViewMode("guest");
          return;
        }

        try {
          const loaded = await readConversation(requestedConversationId);
          if (cancelled) return;

          if (loaded?.access === "public") {
            setPublicConversation(loaded.conversation);
            setViewMode("public");
            return;
          }
        } catch (error) {
          console.error(error);
        }

        setPublicConversation(null);
        setViewMode("not-found");
        return;
      }

      if (cancelled) return;

      setActiveConversation(null);
      setPublicConversation(null);
      setViewMode("guest");
      router.replace("/");
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    clearAllConversations,
    defaultChatMode,
    isAuthenticated,
    navigateToConversation,
    readConversation,
    replaceConversations,
    requestedConversationId,
    router,
    setActiveConversation,
    setDefaultChatMode,
    status,
    upsertConversation,
  ]);

  const handleCreateConversation = useCallback(async () => {
    setActiveConversation(null);
    setPublicConversation(null);
    setViewMode(isAuthenticated ? "owner" : "guest");
    router.push("/");
  }, [isAuthenticated, router, setActiveConversation]);

  const handleOpenConversation = useCallback(async (conversationId: string) => {
    try {
      if (isAuthenticated) {
        const loaded = await readConversation(conversationId);
        if (!loaded || loaded.access !== "owner") {
          toast.error("Unable to open that chat.");
          return;
        }

        upsertConversation(loaded.conversation);
        setActiveConversation(loaded.conversation.id);
        setPublicConversation(null);
        setViewMode("owner");
        navigateToConversation(conversationId);
        return;
      }

      setActiveConversation(conversationId);
      setPublicConversation(null);
      setViewMode("guest");
      navigateToConversation(conversationId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to open that chat.");
    }
  }, [
    isAuthenticated,
    navigateToConversation,
    readConversation,
    setActiveConversation,
    upsertConversation,
  ]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    const currentActiveId = useChatStore.getState().activeConversationId;
    const remaining = useChatStore.getState().conversations.filter((conversation) => conversation.id !== conversationId);

    try {
      if (isAuthenticated) {
        await deleteConversationRequest(conversationId);
      }

      deleteConversation(conversationId);
      setPublicConversation(null);

      if (currentActiveId === conversationId && remaining[0]) {
        await handleOpenConversation(remaining[0].id);
        return;
      }

      if (currentActiveId === conversationId) {
        setActiveConversation(null);
        setPublicConversation(null);
        setViewMode(isAuthenticated ? "owner" : "guest");
        router.push("/");
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete that chat.");
    }
  }, [
    deleteConversation,
    handleOpenConversation,
    isAuthenticated,
    router,
    setActiveConversation,
  ]);

  const handleShareChange = useCallback(async (makePublic: boolean) => {
    const conversationId = useChatStore.getState().activeConversationId;
    if (!conversationId || !isAuthenticated) {
      return;
    }

    setIsShareUpdating(true);

    try {
      const currentConversation = useChatStore
        .getState()
        .conversations
        .find((conversation) => conversation.id === conversationId);
      const updated = normalizeConversation(
        await updateConversationRequest(conversationId, { isPublic: makePublic }),
        [],
        useChatStore.getState().defaultChatMode,
      );

      upsertConversation({
        ...updated,
        messages: currentConversation?.messages ?? [],
      });
    } catch (error) {
      console.error(error);
      toast.error(makePublic ? "Unable to make this chat public." : "Unable to stop sharing this chat.");
      throw error;
    } finally {
      setIsShareUpdating(false);
    }
  }, [isAuthenticated, upsertConversation]);

  const handleRenameConversation = useCallback(async (conversationId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }

    const currentConversation = useChatStore
      .getState()
      .conversations
      .find((conversation) => conversation.id === conversationId);

    if (!currentConversation || currentConversation.title === nextTitle) {
      return;
    }

    upsertConversation({
      ...currentConversation,
      title: nextTitle,
      updatedAt: new Date(),
    });

    try {
      if (isAuthenticated) {
        const updated = normalizeConversation(
          await updateConversationRequest(conversationId, { title: nextTitle }),
          currentConversation.messages,
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(updated);
      }
    } catch (error) {
      console.error(error);
      upsertConversation(currentConversation);
      toast.error("Unable to rename that chat.");
    }
  }, [isAuthenticated, upsertConversation]);

  const handleShareConversation = useCallback(async (conversationId: string) => {
    if (!isAuthenticated) {
      toast.info("Sign in to share chats.");
      return;
    }

    const loaded = await readConversation(conversationId);
    if (!loaded || loaded.access !== "owner") {
      toast.error("Unable to open that chat.");
      return;
    }

    upsertConversation(loaded.conversation);
    setActiveConversation(loaded.conversation.id);
    setPublicConversation(null);
    setViewMode("owner");
    setShareDialogConversationId(loaded.conversation.id);
    navigateToConversation(conversationId);
  }, [
    isAuthenticated,
    navigateToConversation,
    readConversation,
    setActiveConversation,
    upsertConversation,
  ]);

  if (viewMode === "loading") {
    return <LoadingState />;
  }

  if (viewMode === "not-found") {
    return <UnavailableState />;
  }

  return (
    <SidebarProvider defaultOpen={viewMode !== "public"}>
      <div className="flex h-svh w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        {viewMode !== "public" && (
          <AppSidebar
            onCreateConversation={handleCreateConversation}
            onOpenConversation={handleOpenConversation}
            onRenameConversation={handleRenameConversation}
            onShareConversation={handleShareConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
        <ChatWindow
          conversationOverride={viewMode === "public" ? publicConversation : null}
          readOnly={viewMode === "public"}
          canShare={viewMode === "owner" && isAuthenticated}
          onShareChange={handleShareChange}
          isShareUpdating={isShareUpdating}
          shareDialogConversationId={shareDialogConversationId}
          onShareDialogHandled={() => setShareDialogConversationId(null)}
        />
      </div>
    </SidebarProvider>
  );
}
