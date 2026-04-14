"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ErrorToastListener() {
  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      toast.error("Connection Error", {
        description: message,
        duration: 5000,
      });
    };
    window.addEventListener("curator:error", handler);
    return () => window.removeEventListener("curator:error", handler);
  }, []);

  return null;
}
