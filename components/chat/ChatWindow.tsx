"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { TosModal } from "@/components/auth/TosModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SidebarInset } from "@/components/ui/sidebar";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useGuestLimit } from "@/hooks/useGuestLimit";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import type { Citation } from "@/lib/db/schema";

export function ChatWindow() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;

  const {
    activeConversation,
    activeConversationId,
    streamingContent,
    isStreaming,
    temperature,
    newConversation,
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
  const conversation = activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.messages.length,
    streamingContent,
  ]);

  useEffect(() => {
    if (!activeConversationId) newConversation();
  }, [activeConversationId, newConversation]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (activeConversationId && streamingContent) finalizeStreamingMessage(activeConversationId);
    else resetStreamingState();
  }, [activeConversationId, finalizeStreamingMessage, resetStreamingState, streamingContent]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConversationId || isStreaming) return;

    const convId = activeConversationId;
    const controller = new AbortController();
    abortRef.current = controller;

    addMessage(convId, { role: "user", content: text });
    startStreaming();

    const currentConv = useChatStore.getState().activeConversation();
    const seasonYear = currentConv?.seasonYear ?? 2026;
    const history = (currentConv?.messages ?? [])
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    history.push({ role: "user", content: text });

    let accumulated = "";

    await streamOpenRouterChat({
      messages: [{ role: "system", content: buildSystemPrompt(seasonYear) }, ...history],
      temperature,
      seasonYear,
      signal: controller.signal,
      onToken: (token) => {
        accumulated += token;
        updateStreamingContent(accumulated);
      },
      onDone: (citations: Citation[]) => {
        abortRef.current = null;
        finalizeStreamingMessage(convId, citations);
        scrollToBottom();
      },
      onError: (err) => {
        abortRef.current = null;
        finalizeStreamingMessage(convId);
        window.dispatchEvent(new CustomEvent("curator:error", {
          detail: { message: err.message || "Failed to reach OpenRouter." },
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
    isStreaming,
    resetStreamingState,
    scrollToBottom,
    setShowAuthModal,
    startStreaming,
    temperature,
    updateStreamingContent,
  ]);

  const handleSend = useCallback((text: string) => {
    if (!activeConversationId || isStreaming) return;

    if (!tosAccepted) {
      pendingMessageRef.current = text;
      setShowTosModal(true);
      return;
    }

    if (!isAuthenticated) {
      if (!consumeGuestTurn()) return;
    }

    void sendMessage(text);
  }, [
    activeConversationId,
    consumeGuestTurn,
    isAuthenticated,
    isStreaming,
    sendMessage,
    setShowTosModal,
    tosAccepted,
  ]);

  const handleAcceptTos = useCallback(() => {
    acceptTos();
    const pendingMessage = pendingMessageRef.current;
    pendingMessageRef.current = null;
    if (!pendingMessage) return;
    if (!isAuthenticated && !consumeGuestTurn()) return;
    void sendMessage(pendingMessage);
  }, [acceptTos, consumeGuestTurn, isAuthenticated, sendMessage]);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <SidebarInset className="min-h-svh overflow-hidden bg-background">
      <TosModal open={showTosModal} onAccept={handleAcceptTos} />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <SettingsModal />
      <DocumentViewerModal
        open={!!viewerCitation}
        citation={viewerCitation}
        onOpenChange={(open) => {
          if (!open) setViewerCitation(null);
        }}
      />

      <div ref={containerRef} className="relative flex h-full flex-1 flex-col overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-40 pt-8 md:px-6"
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

      {/* Input fixed at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-5 pt-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <InputBar
            onSend={handleSend}
            onStop={stopStreaming}
            disabled={!activeConversationId}
            isStreaming={isStreaming}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
