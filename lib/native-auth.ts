"use client";

import { signIn } from "next-auth/react";

export async function nativeGoogleSignIn(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");

    if (!Capacitor.isNativePlatform()) {
      await signIn("google", { callbackUrl: "/" });
      return;
    }

    const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");
    const result = await GoogleAuth.signIn();
    const idToken = result.authentication.idToken;
    if (!idToken) throw new Error("No ID token");

    await signIn("google-id-token", { idToken, callbackUrl: "/" });
  } catch (err) {
    console.error("Native Google sign-in error:", err);
    // Fall back to web OAuth (opens browser) if native fails
    await signIn("google", { callbackUrl: "/" });
  }
}
