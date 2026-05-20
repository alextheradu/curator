"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  CircleHelpIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  ExternalLinkIcon,
  LogInIcon,
  LogOutIcon,
  PaletteIcon,
  RefreshCcwIcon,
  Settings2Icon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { SupportForm } from "@/components/support/SupportForm";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { REOPEN_ONBOARDING_EVENT } from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import { useChatStore, type ChatMode } from "@/lib/store";
import type { SearchMode } from "@/lib/search-activity";

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

const SEARCH_MODE_OPTIONS: { value: SearchMode; title: string; description: string }[] = [
  { value: "fast", title: "Fast", description: "Starts answering with the available conversation context." },
  { value: "balanced", title: "Balanced", description: "Runs a short source search before tougher answers." },
  { value: "deep", title: "Deep search", description: "Searches more broadly before answering." },
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
        "flex h-9 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-center text-xs font-medium leading-tight transition-colors md:justify-start md:px-3 md:py-2 md:text-left md:text-sm",
        active
          ? "border border-border/60 bg-muted text-foreground md:border-transparent md:font-medium"
          : "border border-border/45 bg-background/35 text-muted-foreground hover:bg-muted/60 hover:text-foreground md:border-transparent md:bg-transparent"
      )}
    >
      <Icon className="hidden size-4 shrink-0 md:block" />
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
      "min-w-0 border-b border-border/50 py-3.5 last:border-0",
      fullWidth
        ? "flex flex-col gap-3"
        : "flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between"
    )}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 max-w-full text-wrap break-words text-xs leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className={cn("min-w-0 max-w-full", fullWidth ? "w-full" : "w-full sm:w-auto sm:shrink-0")}>{children}</div>
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
    <div className="flex w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-muted/40 text-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-w-0 flex-1 text-wrap break-words px-2 py-2 text-center text-[11px] leading-tight transition-colors sm:px-3 sm:text-sm",
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
  const router = useRouter();
  const { data: session, update } = useSession();
  const { theme = "system", setTheme } = useTheme();
  const {
    settingsOpen,
    setSettingsOpen,
    temperature,
    setTemperature,
    defaultChatMode,
    setDefaultChatMode,
    defaultSearchMode,
    setDefaultSearchMode,
    resetSettings,
    conversations,
    sidebarOpen,
  } = useChatStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [isSavingChatMode, setIsSavingChatMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
      const browserSettings = { theme, temperature, defaultChatMode, defaultSearchMode, sidebarOpen, cookieConsent: selectedConsent };

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
    const previousSearchMode = defaultSearchMode;

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
      setDefaultSearchMode(previousSearchMode);
      toast.error(error instanceof Error ? error.message : "Unable to reset settings.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleRedoOnboarding = () => {
    setSettingsOpen(false);
    window.dispatchEvent(new Event(REOPEN_ONBOARDING_EVENT));
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;

    setIsDeletingAccount(true);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Unable to delete account.");

      await fetch("/api/session/end", { method: "POST" }).catch(() => {});
      await signOut({ redirect: false });
      resetSettings();
      setSettingsOpen(false);
      router.push("/");
      toast.success("Account deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const saveDefaultSearchMode = (mode: SearchMode) => {
    setDefaultSearchMode(mode);
    localStorage.setItem("curator:searchMode", mode);
    localStorage.setItem("curator:deepSearch", String(mode === "deep"));
    toast.success(`Default search mode set to ${mode === "deep" ? "deep search" : mode}.`);
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="!left-0 !top-0 !h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-none [&>button]:hidden md:!left-[50%] md:!top-[50%] md:!h-auto md:!w-full md:!max-w-4xl md:!max-h-[calc(100dvh-2rem)] md:!translate-x-[-50%] md:!translate-y-[-50%] md:rounded-2xl md:border md:border-border/60 md:shadow-[var(--shadow-float)] md:[&>button]:flex">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage account, appearance, privacy, data, and support settings for Curator.
        </DialogDescription>
        <div className="flex h-full min-h-0 min-w-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:h-[76dvh] md:flex-row md:pt-0 md:pb-0">

          {/* Mobile header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3 md:hidden">
            <h2 className="text-base font-semibold text-foreground">Settings</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close settings"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {/* nav: scrolls horizontal on mobile, goes vertical on desktop */}
          <div className="min-w-0 shrink-0 border-b border-border/50 bg-card md:flex md:w-52 md:flex-col md:border-b-0 md:border-r">
            <div className="hidden px-4 pb-2 pt-5 md:block">
              <p className="text-base font-semibold text-foreground">Settings</p>
            </div>
            <nav className="grid min-w-0 grid-cols-2 gap-1.5 px-4 py-3 md:flex md:flex-col md:overflow-x-hidden md:overflow-y-auto md:px-3 md:pt-1 md:pb-3">
              {SECTIONS.map((section) => (
                <div key={section.id} className="min-w-0 last:col-span-2 md:last:col-span-1">
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
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto min-w-0 max-w-2xl">

              {/* section title, desktop only */}
              <h2 className="mb-6 hidden text-base font-semibold text-foreground md:sr-only">
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
                          type="button"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => signIn("google", { callbackUrl: "/" })}
                        >
                          <LogInIcon className="size-3.5" />
                          Sign in with Google
                        </Button>
                      </SettingRow>
                    )}
                    {session?.user?.id ? (
                      <SettingRow
                        label="Onboarding"
                        description="Run the profile setup flow again to update your name, team, and default chat mode."
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={handleRedoOnboarding}
                        >
                          Redo onboarding
                        </Button>
                      </SettingRow>
                    ) : null}
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
                    <SectionHeading>Search mode</SectionHeading>
                    {SEARCH_MODE_OPTIONS.map((option) => (
                      <SettingRow
                        key={option.value}
                        label={option.title}
                        description={option.description}
                      >
                        <button
                          type="button"
                          onClick={() => saveDefaultSearchMode(option.value)}
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            defaultSearchMode === option.value
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground/40 hover:border-foreground/60"
                          )}
                          aria-label={`Set default search mode to ${option.title}`}
                        >
                          {defaultSearchMode === option.value ? (
                            <div className="size-2 rounded-full bg-background" />
                          ) : null}
                        </button>
                      </SettingRow>
                    ))}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Stored in this browser.
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
                        type="button"
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
                        type="button"
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
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={async () => {
                            // Clear native Google session so it doesn't auto-restore
                            try {
                              const { Capacitor } = await import("@capacitor/core");
                              if (Capacitor.isNativePlatform()) {
                                const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
                                await GoogleSignIn.signOut();
                              }
                            } catch {}
                            await fetch("/api/session/end", { method: "POST" }).catch(() => {});
                            await signOut({ redirect: false });
                            setSettingsOpen(false);
                            router.push("/");
                          }}
                        >
                          <LogOutIcon className="size-3.5" />
                          Sign out
                        </Button>
                      </SettingRow>
                    ) : (
                      <SettingRow label="Sign in" description="Sync chats and account-level preferences.">
                        <Button
                          type="button"
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
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => {
                            setSettingsOpen(false);
                            router.push("/admin/documents");
                          }}
                        >
                          Admin Panel
                        </Button>
                      </SettingRow>
                    ) : null}
                    {session?.user?.id ? (
                      <SettingRow label="Delete account" description="Permanently remove your account, chats, projects, and saved settings.">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="rounded-lg"
                              disabled={isDeletingAccount}
                            >
                              <Trash2Icon className="size-3.5" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently deletes your account, saved chats, projects, and settings. Support and operational records are redacted where they must be retained for security or support history.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(event) => {
                                  event.preventDefault();
                                  void handleDeleteAccount();
                                }}
                                disabled={isDeletingAccount}
                              >
                                {isDeletingAccount ? "Deleting..." : "Delete account"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
                      Curator is built specifically for FRC. It helps teams work through rules questions, game manuals, scouting, rankings, event updates, team research, and robot programming topics without drifting into unrelated subjects.
                    </p>
                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#0066B3]">Mission</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Give every FRC team fast, trustworthy, season-aware help while keeping the work fair, grounded, and easy to verify.
                      </p>
                    </div>
                  </div>

                  <div>
                    <SectionHeading>How it operates</SectionHeading>
                    <div className="space-y-2">
                      {[
                        "Stays focused on FIRST Robotics Competition rather than acting as a general-purpose chatbot.",
                        "Avoids guessing - when something can't be verified, the right step is to check the official FIRST source.",
                        "Grounds answers in official documents and live event data so teams can verify what they read.",
                        "Helps all teams equally without favoring one team or offering an unfair competitive edge.",
                        "Gives feedback and guidance on strategy, code, and outreach rather than doing the work directly.",
                      ].map((principle) => (
                        <div
                          key={principle}
                          className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          {principle}
                        </div>
                      ))}
                    </div>
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
                    <p className="mt-3 text-xs leading-5 text-muted-foreground/70">
                      Curator is not affiliated with FIRST<sup>®</sup>. For authoritative rules and official program information, check{" "}
                      <a
                        href="https://www.firstinspires.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-[#0066B3] underline underline-offset-4"
                      >
                        firstinspires.org <ExternalLinkIcon className="size-3" />
                      </a>
                      .
                    </p>
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
