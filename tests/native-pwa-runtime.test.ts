import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");

describe("native and PWA runtime guards", () => {
  it("checks Capacitor's native runtime before loading native-only keyboard APIs", () => {
    const providers = readFileSync(path.join(root, "components/Providers.tsx"), "utf8");

    expect(providers).toContain("Capacitor.isNativePlatform()");
  });

  it("checks Capacitor's native runtime before applying native shell layout", () => {
    const providers = readFileSync(path.join(root, "components/Providers.tsx"), "utf8");
    const shell = providers.match(/function CapacitorShell\(\) \{([\s\S]*?)function CapacitorKeyboard/)?.[1] ?? "";

    expect(shell).toContain("Capacitor.isNativePlatform()");
  });

  it("does not precache route HTML that can reference stale Next static assets", () => {
    const worker = readFileSync(path.join(root, "public/sw.js"), "utf8");
    const shellAssets = worker.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/)?.[1] ?? "";

    expect(shellAssets).not.toContain('"/"');
    expect(shellAssets).not.toContain('"/privacy-policy"');
    expect(shellAssets).not.toContain('"/terms-of-service"');
    expect(shellAssets).not.toContain('"/support"');
  });

  it("lets Next static assets use the browser and server cache instead of the app service worker cache", () => {
    const worker = readFileSync(path.join(root, "public/sw.js"), "utf8");

    expect(worker).toContain('url.pathname.startsWith("/_next/static/")');
  });

  it("moves the native empty-state brand above the raised chat bar while the keyboard is open", () => {
    const emptyState = readFileSync(path.join(root, "components/chat/EmptyState.tsx"), "utf8");
    const styles = readFileSync(path.join(root, "app/globals.css"), "utf8");

    expect(emptyState).toContain("data-native-empty");
    expect(styles).toContain("html.capacitor.keyboard-open [data-native-empty]");
    expect(styles).toContain("justify-content: flex-end");
    expect(styles).toContain("padding-bottom: clamp");
  });

  it("animates the composer/root offset with the keyboard instead of snapping it", () => {
    const styles = readFileSync(path.join(root, "app/globals.css"), "utf8");
    const rootRule = styles.match(/html\.capacitor \[data-capacitor-root\] \{([\s\S]*?)\}/)?.[1] ?? "";

    expect(rootRule).toContain("transition: bottom");
  });

  it("gives the mobile Settings sheet the full viewport height with no max-height cap underneath it", () => {
    const settingsModal = readFileSync(path.join(root, "components/ui/SettingsModal.tsx"), "utf8");
    const mobileDialogClass = settingsModal.match(/className="([^"]*!h-\[100dvh\][^"]*)"/)?.[1] ?? "";

    expect(mobileDialogClass).toContain("!h-[100dvh]");
    expect(mobileDialogClass).toContain("!max-h-[100dvh]");
  });

  it("initializes the Apple Sign-In plugin before calling signIn on Android", () => {
    const nativeAuth = readFileSync(path.join(root, "lib/native-auth.ts"), "utf8");
    const appleFn = nativeAuth.match(/export async function nativeAppleSignIn[\s\S]*$/)?.[0] ?? "";

    const initializeIndex = appleFn.indexOf("AppleSignIn.initialize(");
    const signInIndex = appleFn.indexOf("AppleSignIn.signIn(");

    expect(appleFn).toContain('platform === "android"');
    expect(initializeIndex).toBeGreaterThan(-1);
    expect(signInIndex).toBeGreaterThan(initializeIndex);
  });

  it("verifies the Apple Sign-In state param returned on Android matches what was sent", () => {
    const nativeAuth = readFileSync(path.join(root, "lib/native-auth.ts"), "utf8");
    const appleFn = nativeAuth.match(/export async function nativeAppleSignIn[\s\S]*$/)?.[0] ?? "";

    const signInIndex = appleFn.indexOf("AppleSignIn.signIn(");
    const stateCheckIndex = appleFn.indexOf("result.state !== state");

    expect(stateCheckIndex).toBeGreaterThan(signInIndex);
    expect(appleFn).toContain('platform === "android" && result.state !== state');
  });
});
