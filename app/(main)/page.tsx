import { Suspense } from "react";
import { ChatApp } from "@/components/chat/ChatApp";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ChatApp />
    </Suspense>
  );
}
