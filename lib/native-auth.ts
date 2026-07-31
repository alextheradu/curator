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

  // no safari fallback on iOS, kills the UX.
  // needs GIDClientID in Info.plist and NEXT_PUBLIC_AUTH_GOOGLE_ID in .env
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
    if (!idToken) throw new Error("No ID token returned from Google");

    const response = await signIn("google-id-token", {
      idToken,
      callbackUrl: "/",
      redirect: false,
    });

    if (response?.error) {
      throw new Error(`Auth failed: ${response.error} (url: ${response.url ?? ""})`);
    }

    // good, send them in
    window.location.href = response?.url ?? "/";
  } catch (err) {
    console.error("[native-auth] sign-in failed:", err);
    throw err;
  }
}

export async function nativeAppleSignIn(): Promise<void> {
  if (typeof window === "undefined") return;

  const { Capacitor } = await import("@capacitor/core");

  if (!Capacitor.isNativePlatform()) {
    // Web: standard OAuth redirect
    await signIn("apple", { callbackUrl: "/" });
    return;
  }

  // needs "Sign In with Apple" capability enabled in Xcode + on the App ID
  // in the Apple Developer portal (com.apple.developer.applesignin).
  try {
    const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");

    const nonce = crypto.randomUUID();
    const result = await AppleSignIn.signIn({
      scopes: [SignInScope.Email, SignInScope.FullName],
      nonce,
    });

    if (!result.idToken) throw new Error("No ID token returned from Apple");

    const response = await signIn("apple-id-token", {
      idToken: result.idToken,
      nonce,
      firstName: result.givenName ?? "",
      lastName: result.familyName ?? "",
      callbackUrl: "/",
      redirect: false,
    });

    if (response?.error) {
      throw new Error(`Auth failed: ${response.error} (url: ${response.url ?? ""})`);
    }

    window.location.href = response?.url ?? "/";
  } catch (err) {
    console.error("[native-auth] apple sign-in failed:", err);
    throw err;
  }
}
