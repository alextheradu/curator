"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useChatStore } from "@/lib/store";

export function Sidebar() {
  const {
    conversations, activeConversationId, sidebarOpen,
    newConversation, setActiveConversation, deleteConversation,
    setSidebarOpen, setSettingsOpen,
  } = useChatStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex-shrink-0 overflow-hidden"
    >
      <div className="circuit-bg h-full w-[260px] flex flex-col bg-surface-elevated border-r border-surface-border">
        {/* Branding */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-frc-blue/20 border border-frc-blue/30">
            <Bot size={16} className="text-frc-blue" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-wide">CURATOR</h1>
            <p className="text-xs text-text-muted">FRC Intelligence</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <Button
            onClick={newConversation}
            className="w-full gap-2 bg-frc-blue hover:bg-frc-blue/90 text-white font-medium text-sm h-9 transition-all duration-200 hover:shadow-[0_0_15px_rgba(21,101,192,0.4)]"
          >
            <Plus size={15} />
            New Chat
          </Button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-8 px-4">
              Start a new chat to begin exploring FRC knowledge.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-surface-border/60"
            >
              <Settings size={13} />
              Settings
            </button>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-surface-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-xs text-text-muted font-mono">Gemma 3 27B · OpenRouter</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export function SidebarToggle() {
  const { sidebarOpen, setSidebarOpen } = useChatStore();
  return (
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-surface-border transition-colors text-text-muted hover:text-text-primary"
      aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
    >
      {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}
