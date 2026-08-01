"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { nativeAppleSignIn, nativeGoogleSignIn } from "@/lib/native-auth";
import { hasConfirmedAge, requestSignIn } from "@/lib/age-gate";
import { AppleIcon, GoogleIcon } from "@/components/auth/BrandIcons";

const appleEnabled = !!process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED;

export function NativeAuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [isNative, setIsNative] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@capacitor/core").then(({ Capacitor }) => {
      setIsNative(Capacitor.isNativePlatform());
    });
  }, []);

  // Non-native: always render app
  if (!isNative) return <>{children}</>;

  // Native + authenticated: render app
  if (status === "authenticated") return <>{children}</>;

  // Native + unauthenticated or loading: show sign-in screen.
  // Button is disabled while session is still resolving to avoid a sign-in
  // attempt before we know the user is actually logged out.
  const sessionLoading = status === "loading";

  const handleGoogleSignIn = async () => {
    if (!hasConfirmedAge()) {
      // Not confirmed yet - defer to the shared age gate (AgeGateDialog),
      // which will run the real sign-in itself once/if the user confirms.
      requestSignIn("google");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      await nativeGoogleSignIn();
    } catch {
      setError("Sign-in failed. Make sure the app is set up with Google credentials.");
    } finally {
      setSigning(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!hasConfirmedAge()) {
      requestSignIn("apple");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      await nativeAppleSignIn();
    } catch {
      setError("Sign-in failed. Make sure the app is set up with Apple credentials.");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-between bg-[#0f0f0f] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(4rem,env(safe-area-inset-top))]">
      {/* Logo + tagline */}
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-full bg-red-900/40 blur-2xl" />
          <Image src="/logo.png" alt="Curator" width={72} height={72} priority className="relative h-18 w-18 object-contain" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-4xl font-bold tracking-tight text-white">Curator</h1>
          <p className="text-lg font-medium leading-snug text-white/50">
            Your FRC AI assistant
          </p>
        </motion.div>
      </div>

      {/* Auth buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-3"
      >
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-xs text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {appleEnabled && (
          <button
            type="button"
            onClick={() => void handleAppleSignIn()}
            disabled={signing || sessionLoading}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[15px] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-60"
          >
            <AppleIcon />
            {signing ? "Signing in…" : sessionLoading ? "Loading…" : "Continue with Apple"}
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={signing || sessionLoading}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-white text-[15px] font-semibold text-black transition-opacity active:opacity-80 disabled:opacity-60"
        >
          <GoogleIcon />
          {signing ? "Signing in…" : sessionLoading ? "Loading…" : "Continue with Google"}
        </button>

        <p className="text-center text-[11px] leading-5 text-white/30">
          By continuing you agree to our{" "}
          <a href="https://curatorfrc.com/terms-of-service" className="underline underline-offset-2">
            Terms
          </a>{" "}
          and{" "}
          <a href="https://curatorfrc.com/privacy-policy" className="underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </p>
      </motion.div>
    </div>
  );
}
