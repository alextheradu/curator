"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { nativeAppleSignIn, nativeGoogleSignIn } from "@/lib/native-auth";
import {
  AGE_GATE_REQUEST_EVENT,
  hasConfirmedAge,
  markAgeConfirmed,
  type SignInProvider,
} from "@/lib/age-gate";

function runSignIn(provider: SignInProvider) {
  if (provider === "apple") {
    void nativeAppleSignIn();
    return;
  }
  void nativeGoogleSignIn();
}

// Single global gate for every "Sign in with Google/Apple" entry point in
// the app (AuthModal, NativeAuthGate, sidebar). Mounted once in Providers.
// COPPA requires we not knowingly let a child under 13 sign up - this is
// the neutral, non-judgmental screening step recommended for that: it
// doesn't ask "are you a kid" in a way that invites lying, just confirms
// eligibility before account creation proceeds.
export function AgeGateDialog() {
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SignInProvider | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const provider = (event as CustomEvent<{ provider: SignInProvider }>).detail?.provider;
      if (!provider) return;

      if (hasConfirmedAge()) {
        runSignIn(provider);
        return;
      }

      setPendingProvider(provider);
      setBlocked(false);
      setOpen(true);
    };

    window.addEventListener(AGE_GATE_REQUEST_EVENT, handleRequest);
    return () => window.removeEventListener(AGE_GATE_REQUEST_EVENT, handleRequest);
  }, []);

  const handleConfirm = () => {
    markAgeConfirmed();
    setOpen(false);
    if (pendingProvider) {
      runSignIn(pendingProvider);
    }
    setPendingProvider(null);
  };

  const handleDecline = () => {
    setBlocked(true);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setPendingProvider(null);
          setBlocked(false);
        }
      }}
    >
      <DialogContent className="max-w-sm">
        {blocked ? (
          <>
            <DialogHeader>
              <DialogTitle>Curator isn&apos;t available yet</DialogTitle>
              <DialogDescription>
                In compliance with COPPA (the U.S. Children&apos;s Online Privacy Protection Act), Curator
                accounts require you to be at least 13 years old. If you have questions, ask a parent, guardian,
                or your FRC team mentor to reach out through the Support page.
              </DialogDescription>
            </DialogHeader>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Before you sign in</DialogTitle>
              <DialogDescription>
                Curator accounts require you to be at least 13 years old, in compliance with COPPA. Guest chatting
                without an account has no age requirement.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={handleConfirm}>
                I&apos;m 13 or older
              </Button>
              <Button type="button" variant="outline" onClick={handleDecline}>
                I&apos;m under 13
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
