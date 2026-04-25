"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  fetchConversation,
  fetchConversationList,
  fetchConversationMessages,
  fetchProjects,
  transferGuestConversation,
  updateConversation as updateConversationRequest,
} from "@/lib/conversation-api";
import { normalizeConversation, normalizeMessage } from "@/lib/conversations";
import { REOPEN_ONBOARDING_EVENT } from "@/lib/onboarding";
import { normalizeProject } from "@/lib/projects";
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
    setActiveConversation,
    setDefaultChatMode,
    replaceProjects,
    replaceConversations,
    upsertConversation,
    clearAllConversations,
    shareDialogConversationId,
    setShareDialogConversationId,
  } = useChatStore();

  const [viewMode, setViewMode] = useState<ViewMode>("loading");
  const [publicConversation, setPublicConversation] = useState<Conversation | null>(null);
  const [isShareUpdating, setIsShareUpdating] = useState(false);
  const [dismissedOnboardingUserId, setDismissedOnboardingUserId] = useState<string | null>(null);
  const [forceOnboardingOpen, setForceOnboardingOpen] = useState(false);
  const previousAuthRef = useRef(false);
  const hasResolvedAuthRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const accountChatMode = session?.user?.defaultChatMode ?? "veteran";
    if (useChatStore.getState().defaultChatMode !== accountChatMode) {
      setDefaultChatMode(accountChatMode);
    }
  }, [isAuthenticated, session?.user?.defaultChatMode, setDefaultChatMode]);

  useEffect(() => {
    if (!session?.user?.id) {
      setDismissedOnboardingUserId(null);
      setForceOnboardingOpen(false);
      return;
    }

    if (session.user.onboardedAt != null && dismissedOnboardingUserId === session.user.id) {
      setDismissedOnboardingUserId(null);
    }
  }, [dismissedOnboardingUserId, session?.user?.id, session?.user?.onboardedAt]);

  useEffect(() => {
    const handleReopenOnboarding = () => {
      if (!session?.user?.id) {
        return;
      }

      setDismissedOnboardingUserId(null);
      setForceOnboardingOpen(true);
    };

    window.addEventListener(REOPEN_ONBOARDING_EVENT, handleReopenOnboarding);
    return () => window.removeEventListener(REOPEN_ONBOARDING_EVENT, handleReopenOnboarding);
  }, [session?.user?.id]);

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

    const wasAuthenticated = previousAuthRef.current;
    const hasResolvedAuth = hasResolvedAuthRef.current;

    if (hasResolvedAuth && previousAuthRef.current && !isAuthenticated) {
      clearAllConversations();
    }

    previousAuthRef.current = isAuthenticated;
    hasResolvedAuthRef.current = true;

    let cancelled = false;

    const bootstrap = async () => {
      setViewMode("loading");

      if (isAuthenticated) {
        try {
          const guestConversations = useChatStore.getState().conversations;
          const guestConversationIds = new Set(guestConversations.map((conversation) => conversation.id));
          let transferredConversationId: string | null = null;
          const shouldTransferGuestConversation = hasResolvedAuth && !wasAuthenticated;

          if (shouldTransferGuestConversation) {
            const activeConversationId = useChatStore.getState().activeConversationId;
            const activeGuestConversation = guestConversations.find((conversation) => conversation.id === activeConversationId);

            if (activeGuestConversation && activeGuestConversation.messages.length > 0) {
              try {
                const transferred = await transferGuestConversation(activeGuestConversation);
                transferredConversationId = transferred.id;
              } catch (error) {
                console.error(error);
                toast.error("Couldn't transfer your guest chat.");
              }
            }
          }

          const [rows, projectRows] = await Promise.all([
            fetchConversationList(),
            fetchProjects(),
          ]);
          if (cancelled) return;

          replaceProjects(projectRows.map((project) => normalizeProject(project)));
          replaceConversations(
            rows.map((conversation) =>
              normalizeConversation(conversation, [], useChatStore.getState().defaultChatMode)
            )
          );

          const requestedGuestConversation = Boolean(
            requestedConversationId
            && shouldTransferGuestConversation
            && guestConversationIds.has(requestedConversationId)
          );
          const effectiveConversationId = transferredConversationId
            ?? (requestedGuestConversation ? undefined : requestedConversationId);

          if (effectiveConversationId) {
            const loaded = await readConversation(effectiveConversationId);
            if (cancelled) return;

            if (!loaded) {
              setPublicConversation(null);
              if (!requestedGuestConversation) {
                setViewMode("not-found");
                return;
              }
            }

            if (loaded?.access === "owner") {
              upsertConversation(loaded.conversation);
              setActiveConversation(loaded.conversation.id);
              setPublicConversation(null);
              setViewMode("owner");
              if (transferredConversationId) {
                navigateToConversation(transferredConversationId, true);
              }
              return;
            }

            if (loaded?.access === "public") {
              setPublicConversation(loaded.conversation);
              setViewMode("public");
              return;
            }
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
    isAuthenticated,
    navigateToConversation,
    readConversation,
    replaceProjects,
    replaceConversations,
    requestedConversationId,
    router,
    setActiveConversation,
    status,
    upsertConversation,
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

  if (viewMode === "loading") {
    return <LoadingState />;
  }

  if (viewMode === "not-found") {
    return <UnavailableState />;
  }

  return (
    <>
      <OnboardingModal
        open={
          status === "authenticated"
          && (
            forceOnboardingOpen
            || (
              session?.user?.onboardedAt == null
              && dismissedOnboardingUserId !== session?.user?.id
            )
          )
        }
        initialName={session?.user?.name}
        initialPreferredName={session?.user?.preferredName}
        initialTeamNumber={session?.user?.teamNumber}
        initialChatMode={session?.user?.defaultChatMode}
        onCompleted={() => {
          setForceOnboardingOpen(false);
          if (session?.user?.id) {
            setDismissedOnboardingUserId(session.user.id);
          }
        }}
      />
      <ChatWindow
        conversationOverride={viewMode === "public" ? publicConversation : null}
        readOnly={viewMode === "public"}
        canShare={viewMode === "owner" && isAuthenticated}
        onShareChange={handleShareChange}
        isShareUpdating={isShareUpdating}
        shareDialogConversationId={shareDialogConversationId}
        onShareDialogHandled={() => setShareDialogConversationId(null)}
      />
    </>
  );
}
