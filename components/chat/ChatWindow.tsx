"use client";

import Link from "next/link";
import Image from "next/image";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { CopyIcon, GlobeIcon, LinkIcon, LockIcon, Share2Icon } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";

const DocumentViewerModal = lazy(() =>
  import("./DocumentViewerModal").then((m) => ({ default: m.DocumentViewerModal }))
);
const TosModal = lazy(() =>
  import("@/components/auth/TosModal").then((m) => ({ default: m.TosModal }))
);
const AuthModal = lazy(() =>
  import("@/components/auth/AuthModal").then((m) => ({ default: m.AuthModal }))
);
import { SidebarInset, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useGuestLimit } from "@/hooks/useGuestLimit";
import {
  createConversation,
  createConversationMessage,
  updateConversation as updateConversationRecord,
} from "@/lib/conversation-api";
import { normalizeConversation } from "@/lib/conversations";
import type { Citation } from "@/lib/db/schema";
import type { Conversation } from "@/lib/store";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { DEFAULT_SEASON_YEAR } from "@/lib/seasons";
import { generateChatTitle } from "@/lib/utils";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationOverride?: Conversation | null;
  readOnly?: boolean;
  canShare?: boolean;
  onShareChange?: (makePublic: boolean) => Promise<void>;
  isShareUpdating?: boolean;
  shareDialogConversationId?: string | null;
  onShareDialogHandled?: () => void;
}

export function ChatWindow({
  conversationOverride = null,
  readOnly = false,
  canShare = false,
  onShareChange,
  isShareUpdating = false,
  shareDialogConversationId = null,
  onShareDialogHandled,
}: ChatWindowProps) {
  const { data: session, update } = useSession();
  const isAuthenticated = !!session?.user?.id;
  const accountTosAccepted = session?.user?.tosAcceptedAt != null;

  const {
    activeConversation,
    activeConversationId,
    setActiveConversation,
    upsertConversation,
    streamingContent,
    isStreaming,
    temperature,
    defaultChatMode,
    addMessage,
    startStreaming,
    updateStreamingContent,
    finalizeStreamingMessage,
    resetStreamingState,
    setTypingTitle,
    clearTypingTitle,
    updateConversation,
  } = useChatStore();

  const {
    tosAccepted,
    showTosModal,
    setShowTosModal,
    showAuthModal,
    setShowAuthModal,
    acceptGuestTos,
    consumeGuestTurn,
  } = useGuestLimit(isAuthenticated, accountTosAccepted);

  const { setOpenMobile: setSidebarOpenMobile } = useSidebar();

  const abortRef = useRef<AbortController | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const swipeTouchRef = useRef<{ x: number; y: number } | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const [viewerCitation, setViewerCitation] = useState<Citation | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  useEffect(() => {
    const el = swipeContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < window.innerWidth / 2) {
        swipeTouchRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!swipeTouchRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - swipeTouchRef.current.x;
      const dy = Math.abs(touch.clientY - swipeTouchRef.current.y);
      if (dx > 8 && dx > dy) {
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!swipeTouchRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - swipeTouchRef.current.x;
      const dy = Math.abs(touch.clientY - swipeTouchRef.current.y);
      swipeTouchRef.current = null;
      if (dx > 60 && dy < dx) {
        setSidebarOpenMobile(true);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [setSidebarOpenMobile]);

  const conversation = conversationOverride ?? activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.id,
    conversation?.messages.length,
    streamingContent,
  ]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!shareDialogConversationId || !conversation || readOnly) {
      return;
    }

    if (conversation.id === shareDialogConversationId) {
      queueMicrotask(() => {
        setShareDialogOpen(true);
      });
      onShareDialogHandled?.();
    }
  }, [conversation, onShareDialogHandled, readOnly, shareDialogConversationId]);

  const persistLatestAssistantMessage = useCallback(async (conversationId: string, citations?: Citation[]) => {
    if (!isAuthenticated || readOnly) {
      return;
    }

    const currentConversation = useChatStore
      .getState()
      .conversations
      .find((item) => item.id === conversationId);
    const latestMessage = currentConversation?.messages.at(-1);

    if (!latestMessage || latestMessage.role !== "assistant") {
      return;
    }

    try {
      await createConversationMessage(conversationId, {
        id: latestMessage.id,
        role: "assistant",
        content: latestMessage.content,
        citations: citations ?? latestMessage.citations,
      });
    } catch (error) {
      console.error(error);
      toast.error("The latest assistant reply could not be saved.");
    }
  }, [isAuthenticated, readOnly]);

  const stopStreaming = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (activeConversationId && streamingContent) {
      finalizeStreamingMessage(activeConversationId);
      setStreamStatus("");
      await persistLatestAssistantMessage(activeConversationId);
      return;
    }

    setStreamStatus("");
    resetStreamingState();
  }, [
    activeConversationId,
    finalizeStreamingMessage,
    persistLatestAssistantMessage,
    resetStreamingState,
    streamingContent,
  ]);

  const sendMessage = useCallback(async (text: string) => {
    if (isStreaming || readOnly) {
      return;
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      if (isAuthenticated) {
        const created = normalizeConversation(await createConversation(), [], defaultChatMode);
        upsertConversation(created);
        setActiveConversation(created.id);
        conversationId = created.id;
      } else {
        conversationId = useChatStore.getState().newConversation();
        setActiveConversation(conversationId);
      }

      window.history.replaceState(null, "", `/c/${conversationId}`);
    }

    if (!conversationId) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStreamStatus("");

    const previousConversation = useChatStore.getState().activeConversation();
    const previousTitle = previousConversation?.title ?? "New Chat";

    const userMsgId = addMessage(conversationId, { role: "user", content: text });
    const fallbackTitle = generateChatTitle(text);
    const shouldGenerateAiTitle = isAuthenticated && previousTitle === "New Chat";

    if (isAuthenticated) {
      try {
        await createConversationMessage(conversationId, { id: userMsgId, role: "user", content: text });
      } catch (error) {
        console.error(error);
        toast.error("Your message could not be saved.");
      }

      if (previousTitle === "New Chat") {
        try {
          await updateConversationRecord(conversationId, { title: fallbackTitle });
        } catch (error) {
          console.error(error);
        }
      }

      if (shouldGenerateAiTitle) {
        void (async () => {
          try {
            const res = await fetch(`/api/conversations/${conversationId}/title`, { method: "POST" });
            const data = await res.json() as { title: string | null };
            if (!data.title) return;
            setTypingTitle(conversationId, "");
            for (let i = 0; i <= data.title.length; i++) {
              await new Promise((r) => setTimeout(r, 35));
              setTypingTitle(conversationId, data.title.slice(0, i));
            }
            updateConversation(conversationId, { title: data.title });
            clearTypingTitle();
          } catch {
            clearTypingTitle();
          }
        })();
      }
    }

    startStreaming();

    const currentConversation = useChatStore.getState().activeConversation();
    const seasonYear = currentConversation?.seasonYear ?? DEFAULT_SEASON_YEAR;
    const projectId = currentConversation?.projectId ?? null;
    const chatMode = useChatStore.getState().defaultChatMode;
    const history = (currentConversation?.messages ?? [])
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

    let accumulated = "";

    await streamOpenRouterChat({
      messages: history,
      temperature,
      seasonYear,
      chatMode,
      conversationId,
      projectId,
      signal: controller.signal,
      onToken: (token) => {
        accumulated += token;
        updateStreamingContent(accumulated);
      },
      onStatus: (status) => {
        setStreamStatus(status);
      },
      onDone: async (citations: Citation[]) => {
        abortRef.current = null;
        setStreamStatus("");
        finalizeStreamingMessage(conversationId, citations);
        await persistLatestAssistantMessage(conversationId, citations);
        scrollToBottom();
      },
      onError: async (error) => {
        abortRef.current = null;
        setStreamStatus("");
        finalizeStreamingMessage(conversationId);
        await persistLatestAssistantMessage(conversationId);
        window.dispatchEvent(new CustomEvent("curator:error", {
          detail: { message: error.message || "Failed to reach OpenRouter." },
        }));
      },
      onAuthRequired: () => {
        setShowAuthModal(true);
        resetStreamingState();
      },
    });
  }, [
    activeConversationId,
    addMessage,
    finalizeStreamingMessage,
    isAuthenticated,
    isStreaming,
    persistLatestAssistantMessage,
    readOnly,
    resetStreamingState,
    scrollToBottom,
    clearTypingTitle,
    setActiveConversation,
    setShowAuthModal,
    setTypingTitle,
    startStreaming,
    defaultChatMode,
    temperature,
    upsertConversation,
    updateConversation,
    updateStreamingContent,
  ]);

  const handleSend = useCallback((text: string) => {
    if (isStreaming || readOnly) {
      return;
    }

    if (!tosAccepted) {
      pendingMessageRef.current = text;
      setShowTosModal(true);
      return;
    }

    if (!isAuthenticated && !consumeGuestTurn()) {
      return;
    }

    void sendMessage(text);
  }, [
    consumeGuestTurn,
    isAuthenticated,
    isStreaming,
    readOnly,
    sendMessage,
    setShowTosModal,
    tosAccepted,
  ]);

  const handleAcceptTos = useCallback(() => {
    void (async () => {
      try {
        if (isAuthenticated) {
          const response = await fetch("/api/account/tos", { method: "PATCH" });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload.error ?? "Unable to save your terms acceptance.");
          }

          setShowTosModal(false);

          try {
            await update({
              tosAcceptedAt: payload.tosAcceptedAt ?? new Date().toISOString(),
            });
          } catch {
            window.location.reload();
            return;
          }
        } else {
          acceptGuestTos();
        }

        const pendingMessage = pendingMessageRef.current;
        pendingMessageRef.current = null;

        if (!pendingMessage) {
          return;
        }

        if (!isAuthenticated && !consumeGuestTurn()) {
          return;
        }

        void sendMessage(pendingMessage);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Unable to save your terms acceptance.");
      }
    })();
  }, [
    acceptGuestTos,
    consumeGuestTurn,
    isAuthenticated,
    sendMessage,
    setShowTosModal,
    update,
  ]);

  const handleCopyShareLink = useCallback(async () => {
    if (!conversation || !origin) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${origin}/c/${conversation.id}`);
      toast.success("Share link copied.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to copy the share link.");
    }
  }, [conversation, origin]);

  const handleSetPublic = useCallback(async (makePublic: boolean) => {
    if (!conversation || !onShareChange) {
      return;
    }

    await onShareChange(makePublic);
    toast.success(makePublic ? "This chat is now public." : "This chat is private again.");
  }, [conversation, onShareChange]);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;
  const shareUrl = conversation ? `${origin}/c/${conversation.id}` : "";
  const showConversationChrome = readOnly || !isEmpty;

  return (
    <SidebarInset
      className="flex h-screen min-h-0 max-h-screen flex-col overflow-hidden bg-background"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      <div ref={swipeContainerRef} className="contents">
      <Suspense>
        <TosModal open={showTosModal} onAccept={handleAcceptTos} />
        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
        <DocumentViewerModal
          open={!!viewerCitation}
          citation={viewerCitation}
          onOpenChange={(open) => {
            if (!open) {
              setViewerCitation(null);
            }
          }}
        />
      </Suspense>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md border-border/60 bg-background/95">
          {!conversation?.isPublic ? (
            <>
              <DialogHeader>
                <DialogTitle>Make this chat public?</DialogTitle>
                <DialogDescription>
                  Anyone with the link will be able to read this conversation. They will not be able to continue it.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShareDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSetPublic(true)}
                  disabled={isShareUpdating}
                >
                  {isShareUpdating ? "Publishing…" : "Make public"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Share this public chat</DialogTitle>
                <DialogDescription>
                  Anyone with this link can view the conversation until you make it private again.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-2xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <LinkIcon className="size-3.5" />
                  Share link
                </div>
                <p className="mt-2 break-all text-sm text-foreground">{shareUrl}</p>
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                <Button variant="ghost" onClick={() => void handleSetPublic(false)} disabled={isShareUpdating}>
                  <LockIcon className="size-4" />
                  Make private
                </Button>
                <Button onClick={() => void handleCopyShareLink()}>
                  <CopyIcon className="size-4" />
                  Copy link
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AnimatePresence initial={false}>
        {!showConversationChrome && !readOnly && (
          <motion.div
            key="blank-mobile-sidebar-trigger"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-30 md:hidden"
          >
            <SidebarTrigger className="rounded-xl border border-border/50 bg-background/80 text-muted-foreground shadow-sm backdrop-blur" />
          </motion.div>
        )}

        {showConversationChrome && (
          <motion.div
            key="conversation-topbar"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 border-b border-border/40 bg-background/92 px-3 py-2 backdrop-blur md:px-6 md:py-2.5"
          >
            <div className="flex w-full items-center gap-2.5 sm:gap-3">
              <div className="flex shrink-0 items-center justify-center md:hidden">
                {!readOnly && <SidebarTrigger className="text-muted-foreground" />}
              </div>

              <div className="mx-auto flex min-w-0 max-w-3xl flex-1 items-center gap-2.5 sm:gap-3">
                <div className="flex shrink-0 items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Curator"
                    width={32}
                    height={32}
                    priority
                    className="h-7 w-7 object-contain sm:h-8 sm:w-8"
                    style={{ filter: "drop-shadow(0 0 7px rgba(120,40,40,0.22))" }}
                  />
                </div>

                <motion.div
                  key="conversation-meta"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-foreground sm:text-sm">
                      {conversation?.title ?? "New Chat"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 sm:hidden">
                      {readOnly ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <GlobeIcon className="size-2.5" />
                          Public
                        </span>
                      ) : conversation?.isPublic ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                          <GlobeIcon className="size-2.5" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          <LockIcon className="size-2.5" />
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                  {readOnly ? (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                      <GlobeIcon className="size-2.5" />
                      Public · read-only
                    </span>
                  ) : conversation?.isPublic ? (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 sm:inline-flex">
                      <GlobeIcon className="size-2.5" />
                      Public
                    </span>
                  ) : (
                    <span className="hidden shrink-0 items-center gap-1 rounded-full border border-border/50 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                      <LockIcon className="size-2.5" />
                      Private
                    </span>
                  )}
                </motion.div>
                <div className="flex shrink-0 items-center gap-2">
                  <AnimatePresence initial={false} mode="wait">
                    {readOnly ? (
                      <motion.div
                        key="readonly-action"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link
                          href="/"
                          className="inline-flex h-8 shrink-0 items-center rounded-xl border border-border/60 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-3"
                        >
                          <span className="hidden sm:inline">Start your own chat</span>
                          <span className="sm:hidden">Start chat</span>
                        </Link>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="share-action"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Button
                          variant="outline"
                          aria-label="Share"
                          onClick={() => {
                            if (canShare) {
                              setShareDialogOpen(true);
                              return;
                            }

                            setShowAuthModal(true);
                            toast.info("Sign in to share chats.");
                          }}
                          disabled={!conversation || messages.length === 0 || isShareUpdating}
                          className="h-8 shrink-0 px-2 text-xs sm:px-3 sm:text-sm"
                        >
                          <Share2Icon className="size-4" />
                          <span className="hidden sm:inline">Share</span>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="relative flex min-h-0 flex-1 basis-0 flex-col overflow-x-hidden overflow-y-auto overscroll-none">
        <AnimatePresence mode="popLayout">
          {isEmpty && readOnly ? (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-3 px-4 pb-40 pt-16 text-center">
              <div className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                This shared chat is empty
              </div>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                The owner shared the conversation before any messages were added.
              </p>
            </div>
          ) : isEmpty ? (
            <motion.div
              key={`empty-${conversation?.id ?? "root"}`}
              initial={{ opacity: 0, y: 18, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 py-4 sm:px-4 sm:py-8 md:px-6"
            >
              <EmptyState onPromptSelect={handleSend} />
            </motion.div>
          ) : (
            <motion.div
              key={`${conversation?.id ?? "messages"}-${readOnly ? "readonly" : "editable"}`}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.992 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 pb-24 sm:px-4 sm:pb-40 md:px-6"
            >
              <div className="flex flex-col gap-4 pt-4 sm:gap-6 sm:pt-8">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onOpenCitation={setViewerCitation}
                  />
                ))}

                {isStreaming && !streamingContent && (
                  <StreamingIndicator key="indicator" label={streamStatus} />
                )}

                {isStreaming && streamingContent && (
                  <MessageBubble
                    key="streaming"
                    message={{
                      id: "streaming",
                      role: "assistant",
                      content: streamingContent,
                      timestamp: new Date(),
                    }}
                    isStreaming
                    onOpenCitation={setViewerCitation}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="sticky inset-x-0 bottom-0 z-20 mt-auto shrink-0 bg-gradient-to-t from-background via-background/96 to-transparent px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pt-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {readOnly ? (
            <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-composer)]">
              This shared chat is read-only. <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">Open Curator</Link> to start your own conversation.
            </div>
          ) : (
            <InputBar
              onSend={handleSend}
              onStop={() => void stopStreaming()}
              disabled={false}
              isStreaming={isStreaming}
              compact={isEmpty}
            />
          )}
        </div>
      </div>
      </div>
    </SidebarInset>
  );
}
