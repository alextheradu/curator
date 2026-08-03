"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ComponentType } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  ChevronRightIcon,
  CircleHelpIcon,
  CookieIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  MessageSquareIcon,
  PaletteIcon,
  RefreshCcwIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ThermometerIcon,
  Trash2Icon,
  UserCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { SupportForm } from "@/components/support/SupportForm";
import { RecentlyDeletedDialog } from "@/components/sidebar/RecentlyDeletedDialog";
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

// ─── Mobile settings: single scrolling list of grouped rows ───────────────
// Mirrors the reference mobile app's Settings pattern (grouped cards with a
// plain label above each group) instead of desktop's tabbed nav+panel.

function MobileGroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 px-1 text-[13px] text-muted-foreground/75">{children}</p>;
}

function MobileGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border/50 bg-card/60">
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
        <Icon className={cn("size-[18px] shrink-0", destructive ? "text-destructive" : "text-muted-foreground")} />
      ) : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px]", destructive ? "text-destructive" : "text-foreground")}>
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
    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
    interactive && "active:bg-muted/60",
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
      <div className="absolute bottom-2 right-2 size-2.5 rounded-full bg-orange-500" />
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
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [isSavingChatMode, setIsSavingChatMode] = useState(false);
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
      <DialogContent
        className="!left-0 !top-0 !h-[100dvh] !max-h-[100dvh] !w-full !max-w-none !translate-x-0 !translate-y-0 overflow-hidden overflow-x-hidden rounded-none border-0 bg-card p-0 shadow-none [&>button]:hidden md:!left-[50%] md:!top-[50%] md:!h-auto md:!w-full md:!max-w-4xl md:!max-h-[calc(100dvh-2rem)] md:!translate-x-[-50%] md:!translate-y-[-50%] md:rounded-2xl md:border md:border-border/60 md:shadow-[var(--shadow-float)] md:[&>button]:flex"
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
        <div className="flex h-full min-h-0 min-w-0 flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] md:h-[76dvh] md:flex-row md:pt-0 md:pb-0">

          {/* Mobile header - close (left) / title (centered) / spacer (right) */}
          <div className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2.5 md:hidden">
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

          {/* nav: desktop-only vertical rail (mobile uses one continuous grouped list below) */}
          <div className="hidden shrink-0 bg-card md:flex md:w-52 md:flex-col md:border-r md:border-border/50">
            <div className="px-4 pb-2 pt-5">
              <p className="text-base font-semibold text-foreground">Settings</p>
            </div>
            <nav className="flex min-w-0 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 pt-1">
              {SECTIONS.map((section) => (
                <div key={section.id} className="min-w-0">
                  <NavItem
                    active={section.id === activeSection}
                    section={section}
                    onClick={() => setActiveSection(section.id)}
                  />
                </div>
              ))}
            </nav>
          </div>

          {/* Content: desktop tabbed panel */}
          <div className="hidden min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 md:block">
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
                      description={TEMPERATURE_DESCRIPTION}
                      fullWidth
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-3">
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[temperature]}
                            onValueChange={([value]) => setTemperature(value)}
                            thumbLabel="Temperature"
                            valueText={temperatureValueText(temperature)}
                            className="flex-1"
                          />
                          <span className="w-8 text-right font-mono text-xs text-muted-foreground">
                            {temperature.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
                          <span>Focused</span>
                          <span>Creative</span>
                        </div>
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
                    <SectionHeading>History</SectionHeading>
                    <SettingRow
                      label="Recently deleted"
                      description="Restore a deleted chat or remove it for good."
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setRecentlyDeletedOpen(true)}
                      >
                        <Trash2Icon className="size-3.5" />
                        View
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

          {/* Content: mobile grouped list (Claude-style single scroll) */}
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:hidden">
            <div className="mx-auto flex min-w-0 max-w-2xl flex-col gap-6 pb-6">

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
                <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
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
