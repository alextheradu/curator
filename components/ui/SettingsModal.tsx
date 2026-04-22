"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  CircleHelpIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  LogInIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  RefreshCcwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SupportForm } from "@/components/support/SupportForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  COOKIE_CONSENT_EVENT,
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  persistCookieConsent,
  type CookieConsentValue,
} from "@/lib/cookie-consent";
import { readBrowserCookie } from "@/lib/cookies";
import { cn } from "@/lib/utils";
import { useChatStore, type ChatMode } from "@/lib/store";

type SettingsSection = "general" | "personalization" | "data" | "support" | "about";

type SectionConfig = {
  id: SettingsSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const SECTIONS: SectionConfig[] = [
  { id: "general",         label: "General",         icon: Settings2Icon      },
  { id: "personalization", label: "Personalization",  icon: PaletteIcon        },
  { id: "data",            label: "Data controls",    icon: DatabaseBackupIcon },
  { id: "support",         label: "Support",          icon: CircleHelpIcon     },
  { id: "about",           label: "About",            icon: ShieldCheckIcon    },
];

const CHAT_MODE_OPTIONS: { value: ChatMode; title: string; description: string }[] = [
  {
    value: "veteran",
    title: "Veteran",
    description: "Uses full FRC terminology and assumes you know the basics.",
  },
  {
    value: "rookie",
    title: "Rookie",
    description: "Explains jargon in plain English for newer students, families, and mentors.",
  },
];

function readConsent(): CookieConsentValue | null {
  const cookieValue = readBrowserCookie(COOKIE_CONSENT_NAME);
  return parseCookieConsent(cookieValue) ?? parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

function downloadJsonFile(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function NavItem({
  active,
  section,
  onClick,
}: {
  active: boolean;
  section: SectionConfig;
  onClick: () => void;
}) {
  const Icon = section.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {section.label}
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
  fullWidth,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={cn(
      "border-b border-border/50 py-3.5 last:border-0",
      fullWidth
        ? "flex flex-col gap-3"
        : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn(!fullWidth && "sm:shrink-0")}>{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-border bg-muted/40 text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 py-1.5 transition-colors",
            value === opt.value
              ? "bg-foreground font-medium text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
      {children}
    </p>
  );
}

export function SettingsModal() {
  const { data: session, update } = useSession();
  const { theme = "system", setTheme } = useTheme();
  const {
    settingsOpen,
    setSettingsOpen,
    temperature,
    setTemperature,
    defaultChatMode,
    setDefaultChatMode,
    resetSettings,
    conversations,
    sidebarOpen,
  } = useChatStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [isSavingChatMode, setIsSavingChatMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const cookieConsent = useSyncExternalStore(
    (callback) => {
      window.addEventListener(COOKIE_CONSENT_EVENT, callback);
      return () => window.removeEventListener(COOKIE_CONSENT_EVENT, callback);
    },
    () => readConsent(),
    () => null,
  );

  const selectedConsent = cookieConsent ?? "necessary";
  const selectedSection = useMemo(
    () => SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[0],
    [activeSection],
  );

  if (!hydrated) return null;

  const saveAccountChatMode = async (mode: ChatMode) => {
    const previousMode = defaultChatMode;
    setDefaultChatMode(mode);

    if (!session?.user?.id) {
      toast.success(`Default chat style set to ${mode}.`);
      return;
    }

    setIsSavingChatMode(true);
    try {
      const response = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultChatMode: mode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to update the default chat style.");
      await update();
      toast.success(`Default chat style set to ${mode}.`);
    } catch (error) {
      setDefaultChatMode(previousMode);
      toast.error(error instanceof Error ? error.message : "Unable to update the default chat style.");
    } finally {
      setIsSavingChatMode(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const browserSettings = { theme, temperature, defaultChatMode, sidebarOpen, cookieConsent: selectedConsent };

      if (!session?.user?.id) {
        downloadJsonFile("curator-browser-export.json", {
          exportedAt: new Date().toISOString(),
          scope: "browser-only",
          settings: browserSettings,
          conversations,
        });
        toast.success("Browser data exported.");
        return;
      }

      const response = await fetch("/api/account/export", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to export account data.");

      downloadJsonFile("curator-account-export.json", { ...payload, browserSettings });
      toast.success("Account data exported.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to export account data.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetSettings = async () => {
    const previousTheme = theme;
    const previousConsent = selectedConsent;
    const previousTemperature = temperature;
    const previousChatMode = defaultChatMode;

    setIsResetting(true);
    setTheme("system");
    persistCookieConsent("necessary");
    resetSettings();

    try {
      if (session?.user?.id) {
        const response = await fetch("/api/account/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultChatMode: "veteran" }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Unable to reset account settings.");
        await update();
      }
      toast.success("Settings reset to defaults.");
    } catch (error) {
      setTheme(previousTheme);
      persistCookieConsent(previousConsent);
      setTemperature(previousTemperature);
      setDefaultChatMode(previousChatMode);
      toast.error(error instanceof Error ? error.message : "Unable to reset settings.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="overflow-hidden rounded-2xl border-border/60 bg-card p-0 shadow-[var(--shadow-float)] max-w-[calc(100vw-2rem)] sm:max-w-4xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex max-h-[88vh] flex-col md:h-[76vh] md:flex-row">

          {/* Nav sidebar */}
          <div className="border-b border-border/50 bg-card md:flex md:w-52 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
            <div className="hidden px-4 pb-2 pt-5 md:block">
              <p className="text-base font-semibold text-foreground">Settings</p>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 py-2.5 md:flex-col md:overflow-y-auto md:px-3 md:pt-1 md:pb-3">
              {SECTIONS.map((section) => (
                <div key={section.id} className="min-w-[6.5rem] md:min-w-0">
                  <NavItem
                    active={section.id === activeSection}
                    section={section}
                    onClick={() => setActiveSection(section.id)}
                  />
                </div>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="mx-auto max-w-2xl">

              {/* Section title — visible on mobile only (desktop nav has it) */}
              <h2 className="mb-4 text-base font-semibold text-foreground sm:mb-6 md:sr-only">
                {selectedSection.label}
              </h2>

              {activeSection === "general" ? (
                <div className="space-y-8">
                  <div>
                    <SectionHeading>Appearance</SectionHeading>
                    <SettingRow
                      label="Theme"
                      description="Controls interface appearance for this browser."
                    >
                      <SegmentedControl
                        options={[
                          { value: "light", label: "Light" },
                          { value: "dark",  label: "Dark"  },
                          { value: "system", label: "System" },
                        ]}
                        value={theme as "light" | "dark" | "system"}
                        onChange={setTheme}
                      />
                    </SettingRow>
                  </div>

                  <div>
                    <SectionHeading>Privacy</SectionHeading>
                    <SettingRow
                      label="Cookie preferences"
                      description="Browser-specific. Necessary cookies stay on for auth and core settings."
                    >
                      <SegmentedControl
                        options={[
                          { value: "necessary", label: "Necessary only" },
                          { value: "accepted",  label: "Accept analytics" },
                        ]}
                        value={selectedConsent}
                        onChange={(v) => persistCookieConsent(v as CookieConsentValue)}
                      />
                    </SettingRow>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Details in the{" "}
                      <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
                        Privacy Policy
                      </Link>.
                    </p>
                  </div>

                  <div>
                    <SectionHeading>Account</SectionHeading>
                    {session?.user?.email ? (
                      <SettingRow label="Signed in as" description="Chat history and preferences are tied to this account.">
                        <span className="truncate text-sm text-muted-foreground">{session.user.email}</span>
                      </SettingRow>
                    ) : (
                      <SettingRow label="Sign in" description="Sync chat history and preferences across devices.">
                        <Button
                          size="sm"
                          className="rounded-lg"
                          onClick={() => signIn("google", { callbackUrl: "/" })}
                        >
                          <LogInIcon className="size-3.5" />
                          Sign in with Google
                        </Button>
                      </SettingRow>
                    )}
                  </div>
                </div>
              ) : null}

              {activeSection === "personalization" ? (
                <div className="space-y-8">
                  <div>
                    <SectionHeading>Chat style</SectionHeading>
                    {CHAT_MODE_OPTIONS.map((option) => (
                      <SettingRow
                        key={option.value}
                        label={option.title}
                        description={option.description}
                      >
                        <button
                          type="button"
                          onClick={() => void saveAccountChatMode(option.value)}
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            defaultChatMode === option.value
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground/40 hover:border-foreground/60"
                          )}
                        >
                          {defaultChatMode === option.value ? (
                            <div className="size-2 rounded-full bg-background" />
                          ) : null}
                        </button>
                      </SettingRow>
                    ))}
                    {isSavingChatMode ? (
                      <p className="mt-2 text-xs text-muted-foreground">Saving…</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {session?.user?.id
                        ? "Saved to your account."
                        : "Sign in to sync this preference across devices."}
                    </p>
                  </div>

                  <div>
                    <SectionHeading>Response behavior</SectionHeading>
                    <SettingRow
                      label="Temperature"
                      description="Lower is more precise. Higher is more exploratory."
                      fullWidth
                    >
                      <div className="flex items-center gap-3">
                        <Slider
                          min={0}
                          max={1}
                          step={0.1}
                          value={[temperature]}
                          onValueChange={([value]) => setTemperature(value)}
                          className="flex-1"
                        />
                        <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                          {temperature.toFixed(1)}
                        </span>
                      </div>
                    </SettingRow>
                  </div>
                </div>
              ) : null}

              {activeSection === "data" ? (
                <div className="space-y-8">
                  <div>
                    <SectionHeading>Export</SectionHeading>
                    <SettingRow
                      label="Download your data"
                      description="Chats, settings, and account records as JSON."
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => void handleExportData()}
                        disabled={isExporting}
                      >
                        <DownloadIcon className="size-3.5" />
                        {isExporting ? "Preparing…" : "Export"}
                      </Button>
                    </SettingRow>
                  </div>

                  <div>
                    <SectionHeading>Reset</SectionHeading>
                    <SettingRow
                      label="Reset settings"
                      description="Restores theme, cookies, temperature, and chat style to defaults."
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => void handleResetSettings()}
                        disabled={isResetting}
                      >
                        <RefreshCcwIcon className="size-3.5" />
                        {isResetting ? "Resetting…" : "Reset"}
                      </Button>
                    </SettingRow>
                  </div>

                  <div>
                    <SectionHeading>Account access</SectionHeading>
                    {session?.user?.id ? (
                      <SettingRow label="Sign out" description="Remove session from this browser.">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => signOut({ callbackUrl: "/" })}
                        >
                          <LogOutIcon className="size-3.5" />
                          Sign out
                        </Button>
                      </SettingRow>
                    ) : (
                      <SettingRow label="Sign in" description="Sync chats and account-level preferences.">
                        <Button
                          size="sm"
                          className="rounded-lg"
                          onClick={() => signIn("google", { callbackUrl: "/" })}
                        >
                          <LogInIcon className="size-3.5" />
                          Sign in with Google
                        </Button>
                      </SettingRow>
                    )}
                    {session?.user?.isAdmin ? (
                      <SettingRow label="Admin panel" description="Manage documents, users, and reports.">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => { window.location.href = "/admin/documents"; }}
                        >
                          Admin Panel
                        </Button>
                      </SettingRow>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {activeSection === "support" ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Report bugs, request features, or ask privacy and account questions.
                  </p>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-5">
                    <SupportForm />
                  </div>
                </div>
              ) : null}

              {activeSection === "about" ? (
                <div className="space-y-8">
                  <div>
                    <SectionHeading>About Curator</SectionHeading>
                    <p className="text-sm leading-7 text-muted-foreground">
                      Curator is an FRC-focused AI assistant built for rule lookup, team context, and grounded answers across uploaded references and live data.
                    </p>
                    <p className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm leading-7 text-muted-foreground">
                      It can still be wrong. Verify important rulings and competition decisions against official FIRST documentation.
                    </p>
                  </div>

                  <div>
                    <SectionHeading>Legal</SectionHeading>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href="/privacy-policy"
                        className="inline-flex h-9 items-center rounded-lg border border-border/60 px-3.5 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        Privacy Policy
                      </Link>
                      <Link
                        href="/terms-of-service"
                        className="inline-flex h-9 items-center rounded-lg border border-border/60 px-3.5 text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        Terms of Service
                      </Link>
                      <Link
                        href="/support"
                        className="inline-flex h-9 items-center rounded-lg border border-border/60 px-3.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        Standalone support page
                      </Link>
                    </div>
                  </div>
                </div>
              ) : null}

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
