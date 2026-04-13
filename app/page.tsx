"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { ErrorToastListener } from "@/components/ui/ErrorToast";
import { useChatStore } from "@/lib/store";

export default function Home() {
  const { sidebarOpen, setSidebarOpen } = useChatStore();

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <ErrorToastListener />

      {/* Desktop sidebar (in document flow) */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar (overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatWindow />
      <SettingsModal />
    </main>
  );
}
