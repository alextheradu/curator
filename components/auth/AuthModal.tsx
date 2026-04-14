"use client";

import { signIn } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-[#2e2e2e] bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold text-white">
            Create a free account
          </DialogTitle>
          <p className="text-center text-sm text-[#8A8A8A]">
            Sign in to keep chatting and save your conversation history.
          </p>
        </DialogHeader>
        <div className="py-2">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full gap-3 bg-white text-black hover:bg-gray-100"
          >
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-[11px] text-[#8A8A8A]">
          By signing in you agree to our{" "}
          <a href="/terms-of-service" target="_blank" className="underline">Terms</a>{" "}and{" "}
          <a href="/privacy-policy" target="_blank" className="underline">Privacy Policy</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
