"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { nativeGoogleSignIn } from "@/lib/native-auth";

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

  const handleSignIn = async () => {
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

        <button
          type="button"
          onClick={() => void handleSignIn()}
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
