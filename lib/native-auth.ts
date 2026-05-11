"use client";

import { signIn } from "next-auth/react";

export async function nativeGoogleSignIn(): Promise<void> {
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");

  if (!Capacitor.isNativePlatform()) {
    // Web: standard OAuth redirect
    await signIn("google", { callbackUrl: "/" });
    return;
  }

  // Native iOS: never fall back to Safari — that breaks the UX.
  // Requires GIDClientID in Info.plist and NEXT_PUBLIC_AUTH_GOOGLE_ID in .env
  try {
    const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");

    const clientId = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID;
    if (clientId) {
      // serverClientId makes the idToken audience = web client ID so the
      // server can verify it against AUTH_GOOGLE_ID without any extra env var.
      await GoogleSignIn.initialize({ clientId });
    }

    const result = await GoogleSignIn.signIn();
    const idToken = result.idToken;
    if (!idToken) throw new Error("No ID token returned");

    await signIn("google-id-token", { idToken, callbackUrl: "/" });
  } catch (err) {
    // Log but do NOT open Safari — surface the error to the user instead.
    console.error("Native Google sign-in failed:", err);
    throw err;
  }
}
