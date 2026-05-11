"use client";

import { signIn } from "next-auth/react";
import { nativeGoogleSignIn } from "@/lib/native-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function AppleLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 814 1000" className="size-4 fill-current">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.2-49 187.3-49 30.1 0 108.2 2.6 168.3 75.4zm-136-161.2c31.4-37.9 53.9-90.5 53.9-143.1 0-7.5-.6-15.1-1.9-22-.1-.7-.3-1.3-.5-2-50.7 19.7-110 65.1-145.3 108.3-28.5 32.8-55.1 85.9-55.1 139.5 0 8.1.6 16.2 2.6 23.7 3.6 1.3 7.5 1.9 11.4 1.9 44.6 0 99.4-29.5 134.9-106.3z" />
    </svg>
  );
}

const appleEnabled = !!process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED;

export function AuthModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-white/[0.08] bg-[#17191f]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold text-[var(--foreground)]">
            Create a free account
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-[var(--muted-foreground)]">
            Sign in to keep chatting once the guest limit is used.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {appleEnabled && (
            <button
              onClick={() => signIn("apple", { callbackUrl: "/" })}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 active:opacity-75 dark:bg-black dark:text-white dark:border dark:border-white/20"
            >
              <AppleLogo />
              Sign in with Apple
            </button>
          )}
          <Button
            onClick={() => void nativeGoogleSignIn()}
            variant="outline"
            className="w-full gap-3 rounded-2xl"
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
