"use client";

import { useToast } from "@chakra-ui/react";
import { useEffect } from "react";

export function ErrorToastListener() {
  const toast = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      toast({
        title: "Connection Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    };
    window.addEventListener("curator:error", handler);
    return () => window.removeEventListener("curator:error", handler);
  }, [toast]);

  return null;
}
