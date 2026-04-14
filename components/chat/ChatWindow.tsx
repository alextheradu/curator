"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeInfo, Settings2, Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { TosModal } from "@/components/auth/TosModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
    activeConversation, activeConversationId, streamingContent, isStreaming,
    temperature, newConversation, addMessage, updateStreamingContent,
    finalizeStreamingMessage, resetStreamingState, clearConversation, setSettingsOpen,
  } = useChatStore();

  const { showTosModal, showAuthModal, setShowAuthModal, acceptTos, checkBeforeSend } =
    useGuestLimit(isAuthenticated);

  const abortRef = useRef<AbortController | null>(null);
  const conversation = activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.messages.length, streamingContent,
  ]);

  useEffect(() => { if (!activeConversationId) newConversation(); }, [activeConversationId, newConversation]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (activeConversationId && streamingContent) finalizeStreamingMessage(activeConversationId);
    else resetStreamingState();
  }, [activeConversationId, finalizeStreamingMessage, resetStreamingState, streamingContent]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeConversationId || isStreaming) return;
    if (!checkBeforeSend()) return;

    const convId = activeConversationId;
    const controller = new AbortController();
    abortRef.current = controller;

    addMessage(convId, { role: "user", content: text });

    const currentConv = useChatStore.getState().activeConversation();
    const seasonYear = currentConv?.seasonYear ?? 2026;
    const history = (currentConv?.messages ?? [])
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    history.push({ role: "user", content: text });

    let accumulated = "";
    await streamOpenRouterChat({
      messages: [{ role: "system", content: buildSystemPrompt(seasonYear) }, ...history],
      temperature, seasonYear,
      signal: controller.signal,
      onToken: (token) => { accumulated += token; updateStreamingContent(accumulated); },
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
      onAuthRequired: () => { setShowAuthModal(true); resetStreamingState(); },
    });
  }, [
    activeConversationId, isStreaming, temperature, checkBeforeSend,
    addMessage, updateStreamingContent, finalizeStreamingMessage,
    resetStreamingState, scrollToBottom, setShowAuthModal,
  ]);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <SidebarInset className="min-h-svh overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,102,179,0.10),transparent_26%),radial-gradient(circle_at_left,rgba(237,28,36,0.08),transparent_28%)]" />
      <div className="app-shell-grid absolute inset-0 opacity-[0.55]" />

      <TosModal open={showTosModal} onAccept={acceptTos} />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <SettingsModal />

      <header className="sticky top-0 z-20 border-b border-[#2e2e2e] bg-[#0f0f0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8A8A8A]">FRC AI Assistant</p>
            <h2 className="truncate text-lg font-semibold text-white">
              {conversation?.title ?? "New Chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="rounded-full border-[#2e2e2e] bg-[#1a1a1a] text-[#8A8A8A] hover:text-white"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={14} />
              <span className="hidden md:inline">Settings</span>
            </Button>
            {conversation && messages.length > 0 && (
              <Button
                variant="ghost" size="icon"
                onClick={() => clearConversation(conversation.id)}
                className="h-8 w-8 rounded-full text-[#8A8A8A] hover:text-[#ED1C24]"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div key="messages" className="mx-auto flex w-full max-w-3xl flex-col pb-10 pt-6 px-4">
              <div className="mb-4 flex items-center gap-2 text-xs text-[#8A8A8A]">
                <BadgeInfo size={12} />
                Always verify critical rules at firstinspires.org
              </div>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamingContent && (
                <MessageBubble
                  key="streaming"
                  message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
                  isStreaming
                />
              )}
              {isStreaming && !streamingContent && <StreamingIndicator key="indicator" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-[#2e2e2e] bg-[#0f0f0f]/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl">
          <InputBar onSend={handleSend} onStop={stopStreaming}
            disabled={!activeConversationId} isStreaming={isStreaming} />
        </div>
      </div>
    </SidebarInset>
  );
}
