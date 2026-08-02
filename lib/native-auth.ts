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

    console.log("[native-auth] google: opening native sign-in sheet");
    const result = await GoogleSignIn.signIn();

    const idToken = result.idToken;
    if (!idToken) throw new Error("No ID token returned from Google");

    console.log("[native-auth] google: got id token, exchanging with server");

    const response = await signIn("google-id-token", {
      idToken,
      callbackUrl: "/",
      redirect: false,
    });

    if (response?.error) {
      // Deliberately omits response.url: on some next-auth versions it can
      // echo back a query string built from the request, which is not safe
      // to log verbatim.
      console.error(`[native-auth] google: callback rejected (${response.error})`);
      throw new Error(`Auth failed: ${response.error}`);
    }

    console.log("[native-auth] google: callback accepted, navigating in");
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

  // iOS needs "Sign In with Apple" capability enabled in Xcode + on the App ID
  // in the Apple Developer portal (com.apple.developer.applesignin).
  // Android runs Apple's OAuth page in an in-app WebView and needs an Apple
  // Services ID (NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID) with a matching
  // Return URL registered in the Apple Developer portal.
  try {
    const { AppleSignIn, SignInScope } = await import("@capawesome/capacitor-apple-sign-in");

    const platform = Capacitor.getPlatform();
    const nonce = crypto.randomUUID();
    const state = platform === "android" ? crypto.randomUUID() : undefined;

    if (platform === "android") {
      const clientId = process.env.NEXT_PUBLIC_AUTH_APPLE_ANDROID_CLIENT_ID;
      if (!clientId) throw new Error("Apple sign-in is not configured for Android");
      await AppleSignIn.initialize({ clientId });
    }

    const result = await AppleSignIn.signIn({
      scopes: [SignInScope.Email, SignInScope.FullName],
      nonce,
      ...(platform === "android"
        ? {
            // Intentionally hardcoded to match the Return URL registered for
            // this Services ID in the Apple Developer portal - not derived
            // from lib/site.ts, since it must not vary by deployment target.
            redirectUrl: "https://curatorfrc.com/native-auth/apple-callback",
            state,
          }
        : {}),
    });

    if (platform === "android" && result.state !== state) {
      throw new Error("Apple sign-in state mismatch");
    }

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
