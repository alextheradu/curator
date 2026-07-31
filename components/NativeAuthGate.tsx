"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { nativeAppleSignIn, nativeGoogleSignIn } from "@/lib/native-auth";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 814 1000" className="size-5 shrink-0 fill-current">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.2-49 187.3-49 30.1 0 108.2 2.6 168.3 75.4zm-136-161.2c31.4-37.9 53.9-90.5 53.9-143.1 0-7.5-.6-15.1-1.9-22-.1-.7-.3-1.3-.5-2-50.7 19.7-110 65.1-145.3 108.3-28.5 32.8-55.1 85.9-55.1 139.5 0 8.1.6 16.2 2.6 23.7 3.6 1.3 7.5 1.9 11.4 1.9 44.6 0 99.4-29.5 134.9-106.3z" />
    </svg>
  );
}

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
