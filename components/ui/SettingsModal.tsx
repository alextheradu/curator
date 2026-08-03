"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type ComponentType } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  ChevronRightIcon,
  CircleHelpIcon,
  CookieIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MessageSquareIcon,
  RefreshCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  ThermometerIcon,
  Trash2Icon,
  UserCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SupportForm } from "@/components/support/SupportForm";
import { RecentlyDeletedDialog } from "@/components/sidebar/RecentlyDeletedDialog";
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

const TEMPERATURE_DESCRIPTION =
  "Controls how focused or varied responses are. Lower values are more consistent and predictable. Higher values are more creative and varied.";

function temperatureValueText(value: number) {
  if (value <= 0.3) return `${value.toFixed(1)}, focused`;
  if (value >= 0.7) return `${value.toFixed(1)}, creative`;
  return `${value.toFixed(1)}, balanced`;
}

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

// ─── Settings: single scrolling list of grouped rows, shared by mobile and desktop ───
// Mirrors the reference mobile app's Settings pattern (grouped cards with a
// plain label above each group).

function MobileGroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 px-2 text-sm text-muted-foreground">{children}</p>;
}

function MobileGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-[26px] border border-border/60 bg-accent">
      {children}
    </div>
  );
}

function MobileRow({
  icon: Icon,
  label,
  description,
  value,
  onClick,
  href,
  external,
  destructive,
  disabled,
  trailing,
}: {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  const interactive = Boolean((onClick || href) && !disabled);
  const content = (
    <>
      {Icon ? (
        <Icon className={cn("size-5 shrink-0", destructive ? "text-destructive" : "text-muted-foreground")} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-base", destructive ? "text-destructive" : "text-foreground")}>
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
        ) : null}
      </span>
      {trailing !== undefined ? trailing : (
        <>
          {value ? <span className="shrink-0 truncate text-sm text-muted-foreground">{value}</span> : null}
          {onClick || href ? <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground/50" /> : null}
        </>
      )}
    </>
  );

  const rowClassName = cn(
    "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors",
    interactive && "active:bg-muted",
    disabled && "opacity-50"
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={rowClassName} onClick={onClick}>
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={rowClassName} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled || !onClick} className={rowClassName}>
      {content}
    </button>
  );
}

function ThemeSwatchFace({ mode }: { mode: "light" | "dark" | "system" }) {
  const background =
    mode === "light"
      ? "oklch(1 0 0)"
      : mode === "dark"
        ? "oklch(0.18 0 0)"
        : "linear-gradient(135deg, oklch(1 0 0) 50%, oklch(0.18 0 0) 50%)";
  const lineColor = mode === "dark" ? "bg-white/25" : "bg-black/20";

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-1 px-3" style={{ background }}>
      <div className={cn("h-1.5 w-3/4 rounded-full", lineColor)} />
      <div className={cn("h-1.5 w-1/2 rounded-full", lineColor)} />
    </div>
  );
}

function MobileThemeSwatches({
  value,
  onChange,
}: {
  value: "light" | "dark" | "system";
  onChange: (v: "light" | "dark" | "system") => void;
}) {
  const options: { value: "light" | "dark" | "system"; label: string }[] = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 transition-colors",
                active ? "border-blue-500" : "border-transparent"
              )}
            >
              <ThemeSwatchFace mode={opt.value} />
            </span>
            <span className={cn("text-xs font-medium", active ? "text-blue-500" : "text-muted-foreground")}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
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
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [recentlyDeletedOpen, setRecentlyDeletedOpen] = useState(false);

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

  if (!hydrated) return null;

  const saveAccountChatMode = async (mode: ChatMode) => {
    const previousMode = defaultChatMode;
    setDefaultChatMode(mode);

    if (!session?.user?.id) {
      toast.success(`Default chat style set to ${mode}.`);
      return;
    }

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
      <DialogContent
        className="!left-0 !top-0 !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-none [&>button]:hidden md:!left-[50%] md:!top-[50%] md:!h-auto md:!w-full md:!max-w-2xl md:!max-h-[calc(100dvh-2rem)] md:!translate-x-[-50%] md:!translate-y-[-50%] md:rounded-2xl md:border md:border-border/60 md:shadow-[var(--shadow-float)]"
        onPointerDownOutside={(event) => {
          // iPhone Mirroring forwards Mac trackpad/mouse clicks as synthetic
          // pointer events. When the real click target can't be resolved
          // (a known WebKit quirk with synthetic pointer input), the event
          // target resolves to <body>/<html> instead of the actual element
          // the user clicked - which Radix's outside-click detection then
          // reads as "clicked outside the dialog" and closes it, even for
          // clicks on real controls inside Settings. A genuine outside click
          // never targets body/html directly, so treat that as unresolved
          // and ignore it rather than dismiss.
          const target = event.target as Node | null;
          if (!target || target === document.body || target === document.documentElement) {
            event.preventDefault();
          }
        }}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Manage account, appearance, privacy, data, and support settings for Curator.
        </DialogDescription>
        <div className="flex h-full min-h-0 min-w-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:h-[76dvh] md:pt-0 md:pb-0">

          {/* Header - close (left) / title (centered) / spacer (right) */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground transition-colors hover:bg-muted"
              aria-label="Close settings"
            >
              <XIcon className="size-4" />
            </button>
            <h2 className="flex-1 text-center text-[17px] font-semibold text-foreground">Settings</h2>
            <div className="size-9 shrink-0" aria-hidden="true" />
          </div>

          {/* Content: grouped list (Claude-style single scroll), shared by mobile and desktop */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
            <div className="mx-auto flex min-w-0 max-w-2xl flex-col gap-7 pb-6">

              <MobileGroup>
                {session?.user?.email ? (
                  <MobileRow icon={MailIcon} label={session.user.email} description="Signed in" />
                ) : (
                  <MobileRow
                    icon={LogInIcon}
                    label="Sign in with Google"
                    description="Sync chat history and preferences across devices."
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                  />
                )}
              </MobileGroup>

              <div>
                <MobileGroupLabel>Appearance</MobileGroupLabel>
                <MobileGroup>
                  <div className="px-4 py-4">
                    <MobileThemeSwatches value={theme as "light" | "dark" | "system"} onChange={setTheme} />
                  </div>
                </MobileGroup>
              </div>

              <div>
                <MobileGroupLabel>Personalization</MobileGroupLabel>
                <MobileGroup>
                  {CHAT_MODE_OPTIONS.map((option) => (
                    <MobileRow
                      key={option.value}
                      icon={MessageSquareIcon}
                      label={option.title}
                      description={option.description}
                      onClick={() => void saveAccountChatMode(option.value)}
                      trailing={
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                            defaultChatMode === option.value ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                          )}
                        >
                          {defaultChatMode === option.value ? <span className="size-2 rounded-full bg-background" /> : null}
                        </span>
                      }
                    />
                  ))}
                  {SEARCH_MODE_OPTIONS.map((option) => (
                    <MobileRow
                      key={option.value}
                      icon={SearchIcon}
                      label={option.title}
                      description={option.description}
                      onClick={() => saveDefaultSearchMode(option.value)}
                      trailing={
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                            defaultSearchMode === option.value ? "border-foreground bg-foreground" : "border-muted-foreground/40"
                          )}
                        >
                          {defaultSearchMode === option.value ? <span className="size-2 rounded-full bg-background" /> : null}
                        </span>
                      }
                    />
                  ))}
                  <div className="px-4 py-3.5">
                    <div className="mb-2.5 flex items-center gap-3">
                      <ThermometerIcon className="size-[18px] shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-[15px] text-foreground">Temperature</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{temperature.toFixed(1)}</span>
                    </div>
                    <p className="mb-2.5 text-xs leading-5 text-muted-foreground">
                      {TEMPERATURE_DESCRIPTION}
                    </p>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={[temperature]}
                      onValueChange={([v]) => setTemperature(v)}
                      thumbLabel="Temperature"
                      valueText={temperatureValueText(temperature)}
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground/70">
                      <span>Focused</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </MobileGroup>
              </div>

              <div>
                <MobileGroupLabel>Data &amp; privacy</MobileGroupLabel>
                <MobileGroup>
                  <MobileRow
                    icon={CookieIcon}
                    label="Cookie preferences"
                    description={selectedConsent === "accepted" ? "Analytics accepted" : "Necessary cookies only"}
                    onClick={() => persistCookieConsent(selectedConsent === "accepted" ? "necessary" : "accepted")}
                    value={selectedConsent === "accepted" ? "On" : "Off"}
                  />
                  <MobileRow
                    icon={DownloadIcon}
                    label="Download your data"
                    description="Chats, settings, and account records as JSON."
                    onClick={() => void handleExportData()}
                    disabled={isExporting}
                    value={isExporting ? "Preparing…" : undefined}
                  />
                  <MobileRow
                    icon={HistoryIcon}
                    label="Recently deleted"
                    description="Restore a deleted chat or remove it for good."
                    onClick={() => setRecentlyDeletedOpen(true)}
                  />
                  <MobileRow
                    icon={RefreshCcwIcon}
                    label="Reset settings"
                    description="Restores theme, cookies, temperature, and chat style."
                    onClick={() => void handleResetSettings()}
                    disabled={isResetting}
                    value={isResetting ? "Resetting…" : undefined}
                  />
                </MobileGroup>
              </div>

              {session?.user?.id ? (
                <div className="flex flex-col gap-3">
                  <div>
                    <MobileGroupLabel>Account</MobileGroupLabel>
                    <MobileGroup>
                      <MobileRow
                        icon={UserCircleIcon}
                        label="Redo onboarding"
                        description="Update your name, team, and default chat mode."
                        onClick={handleRedoOnboarding}
                      />
                      {session.user.isAdmin ? (
                        <MobileRow
                          icon={ShieldCheckIcon}
                          label="Admin panel"
                          description="Manage documents, users, and reports."
                          onClick={() => {
                            setSettingsOpen(false);
                            router.push("/admin/documents");
                          }}
                        />
                      ) : null}
                    </MobileGroup>
                  </div>

                  <MobileGroup>
                    <MobileRow
                      icon={LogOutIcon}
                      label="Sign out"
                      destructive
                      trailing={null}
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
                    />
                  </MobileGroup>

                  <MobileGroup>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <MobileRow
                          icon={Trash2Icon}
                          label="Delete account"
                          description="Permanently remove your account, chats, projects, and settings."
                          destructive
                          trailing={null}
                          disabled={isDeletingAccount}
                          onClick={() => {}}
                        />
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
                  </MobileGroup>
                </div>
              ) : null}

              <div>
                <MobileGroupLabel>Support</MobileGroupLabel>
                <div className="rounded-[26px] border border-border/60 bg-accent p-4">
                  <SupportForm />
                </div>
              </div>

              <div>
                <MobileGroupLabel>About</MobileGroupLabel>
                <MobileGroup>
                  <div className="px-4 py-3.5">
                    <p className="text-sm leading-6 text-muted-foreground">
                      Curator is built specifically for FRC. It helps teams work through rules questions, game manuals, scouting, rankings, event updates, team research, and robot programming topics without drifting into unrelated subjects.
                    </p>
                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#0066B3]">Mission</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Give every FRC team fast, trustworthy, season-aware help while keeping the work fair, grounded, and easy to verify.
                      </p>
                    </div>
                  </div>
                </MobileGroup>

                <MobileGroup>
                  <div className="space-y-2 px-4 py-3.5">
                    {[
                      "Stays focused on FIRST Robotics Competition rather than acting as a general-purpose chatbot.",
                      "Avoids guessing - when something can't be verified, the right step is to check the official FIRST source.",
                      "Grounds answers in official documents and live event data so teams can verify what they read.",
                      "Helps all teams equally without favoring one team or offering an unfair competitive edge.",
                      "Gives feedback and guidance on strategy, code, and outreach rather than doing the work directly.",
                    ].map((principle) => (
                      <p key={principle} className="text-sm leading-6 text-muted-foreground">
                        {principle}
                      </p>
                    ))}
                  </div>
                </MobileGroup>

                <MobileGroup>
                  <MobileRow icon={ShieldCheckIcon} label="Privacy Policy" href="/privacy-policy" onClick={() => setSettingsOpen(false)} />
                  <MobileRow icon={FileTextIcon} label="Terms of Service" href="/terms-of-service" onClick={() => setSettingsOpen(false)} />
                  <MobileRow icon={CircleHelpIcon} label="Standalone support page" href="/support" onClick={() => setSettingsOpen(false)} />
                </MobileGroup>

                <p className="mt-3 px-1 text-xs leading-5 text-muted-foreground/70">
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
          </div>
        </div>
      </DialogContent>
      <RecentlyDeletedDialog open={recentlyDeletedOpen} onOpenChange={setRecentlyDeletedOpen} />
    </Dialog>
  );
}
