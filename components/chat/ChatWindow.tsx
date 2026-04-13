"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { SeasonSelector } from "@/components/ui/SeasonSelector";
import { SidebarToggle } from "@/components/sidebar/Sidebar";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";

export function ChatWindow() {
  const {
    activeConversation, activeConversationId,
    streamingContent, isStreaming, temperature, apiKeyOverride,
    newConversation, addMessage, updateStreamingContent,
    finalizeStreamingMessage, clearConversation,
  } = useChatStore();

  const conversation = activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.messages.length, streamingContent,
  ]);

  useEffect(() => {
    if (!activeConversationId) newConversation();
  }, [activeConversationId, newConversation]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeConversationId || isStreaming) return;
      const convId = activeConversationId;

      addMessage(convId, { role: "user", content: text });

      const currentConv = useChatStore.getState().activeConversation();
      const seasonYear = currentConv?.seasonYear ?? 2025;
      const history = (currentConv?.messages ?? [])
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      history.push({ role: "user", content: text });

      let accumulated = "";
      await streamOpenRouterChat({
        messages: [{ role: "system", content: buildSystemPrompt(seasonYear) }, ...history],
        temperature,
        apiKey: apiKeyOverride || undefined,
        onToken: (token) => {
          accumulated += token;
          updateStreamingContent(accumulated);
        },
        onDone: () => {
          finalizeStreamingMessage(convId);
          scrollToBottom();
        },
        onError: (err) => {
          finalizeStreamingMessage(convId);
          window.dispatchEvent(
            new CustomEvent("curator:error", {
              detail: { message: err.message || "Failed to reach OpenRouter. Check your API key." },
            })
          );
        },
      });
    },
    [activeConversationId, isStreaming, temperature, apiKeyOverride,
     addMessage, updateStreamingContent, finalizeStreamingMessage, scrollToBottom]
  );

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Header */}
      <div className="scanline flex items-center gap-3 px-4 h-14 border-b border-surface-border bg-surface-elevated/50 backdrop-blur-sm flex-shrink-0">
        <SidebarToggle />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {conversation?.title ?? "Curator"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {conversation && (
            <SeasonSelector conversationId={conversation.id} value={conversation.seasonYear} />
          )}
          {conversation && messages.length > 0 && (
            <button
              onClick={() => clearConversation(conversation.id)}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-border text-text-muted hover:text-frc-red transition-all"
              title="Clear chat"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div key="messages" className="py-4">
              {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
              {isStreaming && streamingContent && (
                <MessageBubble
                  key="streaming"
                  message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
                  isStreaming
                  streamContent={streamingContent}
                />
              )}
              {isStreaming && !streamingContent && <StreamingIndicator key="indicator" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InputBar onSend={handleSend} disabled={!activeConversationId} isStreaming={isStreaming} />
    </div>
  );
}
