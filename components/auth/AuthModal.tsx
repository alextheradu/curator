"use client";

import { requestSignIn } from "@/lib/age-gate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppleIcon, GoogleIcon } from "@/components/auth/BrandIcons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
              onClick={() => requestSignIn("apple")}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90 active:opacity-75 dark:bg-black dark:text-white dark:border dark:border-white/20"
            >
              <AppleIcon />
              Sign in with Apple
            </button>
          )}
          <Button
            onClick={() => requestSignIn("google")}
            variant="outline"
            className="w-full gap-3 rounded-2xl"
          >
            <GoogleIcon />
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
