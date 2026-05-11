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

    const { GoogleSignIn } = await import(
      "@capawesome/capacitor-google-sign-in"
    );

    // Initialize with the *web* client ID so the idToken audience
    // matches AUTH_GOOGLE_ID and can be verified server-side.
    await GoogleSignIn.initialize({
      clientId: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ID ?? "",
    });

    const result = await GoogleSignIn.signIn();
    const idToken = result.idToken;
    if (!idToken) throw new Error("No ID token");

    await signIn("google-id-token", { idToken, callbackUrl: "/" });
  } catch (err) {
    console.error("Native Google sign-in error:", err);
    // Fall back to web OAuth (opens browser) if native fails
    await signIn("google", { callbackUrl: "/" });
  }
}
