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
      <DialogContent className="max-w-sm border-white/[0.08] bg-[#17191f]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold text-[var(--foreground)]">
            Create a free account
          </DialogTitle>
          <p className="text-center text-sm text-[var(--muted-foreground)]">
            Sign in to keep chatting once the guest limit is used.
          </p>
        </DialogHeader>
        <div className="py-2">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full gap-3 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#fff8eb]"
          >
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-[11px] text-[var(--muted-foreground)]">
          By signing in you agree to our{" "}
          <a href="/terms-of-service" target="_blank" className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" target="_blank" className="underline">
            Privacy Policy
          </a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
