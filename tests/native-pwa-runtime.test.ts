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
});
