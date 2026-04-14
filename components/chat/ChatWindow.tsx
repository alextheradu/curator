"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { CopyIcon, GlobeIcon, LinkIcon, LockIcon, Share2Icon } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { TosModal } from "@/components/auth/TosModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
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
import { createConversationMessage, updateConversation } from "@/lib/conversation-api";
import type { Citation } from "@/lib/db/schema";
import type { Conversation } from "@/lib/store";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationOverride?: Conversation | null;
  readOnly?: boolean;
  canShare?: boolean;
  onShareChange?: (makePublic: boolean) => Promise<void>;
  isShareUpdating?: boolean;
}

export function ChatWindow({
  conversationOverride = null,
  readOnly = false,
  canShare = false,
  onShareChange,
  isShareUpdating = false,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;

  const {
    activeConversation,
    activeConversationId,
    streamingContent,
    isStreaming,
    temperature,
    addMessage,
    startStreaming,
    updateStreamingContent,
    finalizeStreamingMessage,
    resetStreamingState,
  } = useChatStore();

  const {
    tosAccepted,
    showTosModal,
    setShowTosModal,
    showAuthModal,
    setShowAuthModal,
    acceptTos,
    consumeGuestTurn,
  } = useGuestLimit(isAuthenticated);

  const abortRef = useRef<AbortController | null>(null);
  const pendingMessageRef = useRef<string | null>(null);
  const [viewerCitation, setViewerCitation] = useState<Citation | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  const conversation = conversationOverride ?? activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.id,
    conversation?.messages.length,
    streamingContent,
  ]);

  useEffect(() => () => abortRef.current?.abort(), []);

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
      await persistLatestAssistantMessage(activeConversationId);
      return;
    }

    resetStreamingState();
  }, [
    activeConversationId,
    finalizeStreamingMessage,
    persistLatestAssistantMessage,
    resetStreamingState,
    streamingContent,
  ]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConversationId || isStreaming || readOnly) {
      return;
    }

    const conversationId = activeConversationId;
    const controller = new AbortController();
    abortRef.current = controller;

    const previousConversation = useChatStore.getState().activeConversation();
    const previousTitle = previousConversation?.title ?? "New Chat";

    addMessage(conversationId, { role: "user", content: text });

    if (isAuthenticated) {
      try {
        await createConversationMessage(conversationId, { role: "user", content: text });
      } catch (error) {
        console.error(error);
        toast.error("Your message could not be saved.");
      }

      const updatedConversation = useChatStore.getState().activeConversation();
      if (updatedConversation && updatedConversation.title !== previousTitle) {
        try {
          await updateConversation(conversationId, { title: updatedConversation.title });
        } catch (error) {
          console.error(error);
        }
      }
    }

    startStreaming();

    const currentConversation = useChatStore.getState().activeConversation();
    const seasonYear = currentConversation?.seasonYear ?? 2026;
    const history = (currentConversation?.messages ?? [])
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content }));

    let accumulated = "";

    await streamOpenRouterChat({
      messages: history,
      temperature,
      seasonYear,
      signal: controller.signal,
      onToken: (token) => {
        accumulated += token;
        updateStreamingContent(accumulated);
      },
      onDone: async (citations: Citation[]) => {
        abortRef.current = null;
        finalizeStreamingMessage(conversationId, citations);
        await persistLatestAssistantMessage(conversationId, citations);
        scrollToBottom();
      },
      onError: async (error) => {
        abortRef.current = null;
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
    setShowAuthModal,
    startStreaming,
    temperature,
    updateStreamingContent,
  ]);

  const handleSend = useCallback((text: string) => {
    if (!activeConversationId || isStreaming || readOnly) {
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
    activeConversationId,
    consumeGuestTurn,
    isAuthenticated,
    isStreaming,
    readOnly,
    sendMessage,
    setShowTosModal,
    tosAccepted,
  ]);

  const handleAcceptTos = useCallback(() => {
    acceptTos();
    const pendingMessage = pendingMessageRef.current;
    pendingMessageRef.current = null;

    if (!pendingMessage) {
      return;
    }

    if (!isAuthenticated && !consumeGuestTurn()) {
      return;
    }

    void sendMessage(pendingMessage);
  }, [acceptTos, consumeGuestTurn, isAuthenticated, sendMessage]);

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

  return (
    <SidebarInset className="min-h-svh overflow-hidden bg-background">
      <TosModal open={showTosModal} onAccept={handleAcceptTos} />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <SettingsModal />
      <DocumentViewerModal
        open={!!viewerCitation}
        citation={viewerCitation}
        onOpenChange={(open) => {
          if (!open) {
            setViewerCitation(null);
          }
        }}
      />

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

      <div className="border-b border-border/60 bg-background/90 px-3 py-2 backdrop-blur md:px-6 md:py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          {/* Sidebar trigger — mobile only */}
          {!readOnly && (
            <SidebarTrigger className="shrink-0 text-muted-foreground md:hidden" />
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {conversation?.title ?? "New Chat"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {readOnly ? (
                <>
                  <GlobeIcon className="size-3.5" />
                  Public read-only chat
                </>
              ) : conversation?.isPublic ? (
                <>
                  <GlobeIcon className="size-3.5" />
                  Public
                </>
              ) : (
                <>
                  <LockIcon className="size-3.5" />
                  Private
                </>
              )}
            </div>
          </div>

          {readOnly ? (
            <Link
              href="/"
              className="inline-flex h-8 items-center rounded-xl border border-border/60 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Start your own chat
            </Link>
          ) : canShare ? (
            <Button
              variant="outline"
              onClick={() => setShareDialogOpen(true)}
              disabled={!conversation || messages.length === 0 || isShareUpdating}
            >
              <Share2Icon className="size-4" />
              Share
            </Button>
          ) : null}
        </div>
      </div>

      <div ref={containerRef} className="relative flex h-full flex-1 flex-col overflow-y-auto">
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
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div
              key={`${conversation?.id ?? "messages"}-${readOnly ? "readonly" : "editable"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-28 pt-6 sm:pb-40 sm:pt-8 md:px-6"
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onOpenCitation={setViewerCitation}
                />
              ))}

              {isStreaming && !streamingContent && (
                <StreamingIndicator key="indicator" />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-3 pt-5 sm:px-4 sm:pb-5 sm:pt-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {readOnly ? (
            <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-composer)]">
              This shared chat is read-only. <Link href="/" className="font-medium text-foreground underline-offset-4 hover:underline">Open Curator</Link> to start your own conversation.
            </div>
          ) : (
            <InputBar
              onSend={handleSend}
              onStop={() => void stopStreaming()}
              disabled={!activeConversationId}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    </SidebarInset>
  );
}
