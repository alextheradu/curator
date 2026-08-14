"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStore, type ChatMode } from "@/lib/store";
import type { SearchMode } from "@/lib/search-activity";

interface OnboardingModalProps {
  open: boolean;
  initialName?: string | null;
  initialPreferredName?: string | null;
  initialTeamNumber?: number | null;
  initialChatMode?: ChatMode;
  initialSearchMode?: SearchMode;
  onCompleted?: () => void;
}

const STEP_COUNT = 4;

const CHAT_MODE_OPTIONS: Array<{
  value: ChatMode;
  title: string;
  description: string;
}> = [
  {
    value: "veteran",
    title: "Veteran",
    description: "Uses normal FRC terminology and assumes you already know the basics.",
  },
  {
    value: "rookie",
    title: "Rookie",
    description: "Explains jargon in simpler language for newer students, families, and mentors.",
  },
];

const SEARCH_MODE_OPTIONS: Array<{
  value: SearchMode;
  title: string;
  description: string;
}> = [
  {
    value: "fast",
    title: "Fast",
    description: "Starts answering quickly and uses conversation context only.",
  },
  {
    value: "balanced",
    title: "Balanced",
    description: "Does a short PDF, web, and live-data check before tougher answers.",
  },
  {
    value: "deep",
    title: "Deep search",
    description: "Spends more time searching PDFs, web, and live tools before answering.",
  },
];

function getDefaultName(name?: string | null, preferredName?: string | null) {
  if (preferredName?.trim()) {
    return preferredName.trim().slice(0, 30);
  }

  if (!name?.trim()) {
    return "";
  }

  return name.trim().slice(0, 30);
}

function focusOnboardingField(step: number, selectedChatMode: ChatMode) {
  const targetId = step === 1
    ? "preferred-name"
    : step === 2
      ? "team-number"
      : step === 3
        ? `chat-mode-${selectedChatMode}`
        : "search-mode-fast";

  const target = document.getElementById(targetId) ?? document.getElementById("onboarding-next-step");

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

// Tapping empty space inside the scroll area (not a real input/button)
// should dismiss the keyboard, same as tapping outside the sheet - but
// without closing the dialog, since onInteractOutside is suppressed below.
function dismissKeyboardOnEmptyTap(event: React.PointerEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget) {
    return;
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur();
  }
}

export function OnboardingModal({
  open,
  initialName,
  initialPreferredName,
  initialTeamNumber,
  initialChatMode = "veteran",
  initialSearchMode = "fast",
  onCompleted,
}: OnboardingModalProps) {
  const router = useRouter();
  const { update } = useSession();
  const { setDefaultChatMode, setDefaultSearchMode } = useChatStore();
  const [step, setStep] = useState(1);
  const [preferredName, setPreferredName] = useState("");
  const [teamNumberInput, setTeamNumberInput] = useState("");
  const [isNoTeam, setIsNoTeam] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("veteran");
  const [searchMode, setSearchMode] = useState<SearchMode>("fast");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Guards a rapid double Enter (or a hardware-keyboard key-repeat) from
  // advancing two steps off a single intended press.
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(1);
    setPreferredName(getDefaultName(initialName, initialPreferredName));
    setTeamNumberInput(initialTeamNumber ? String(initialTeamNumber) : "");
    setIsNoTeam(false);
    setChatMode(initialChatMode);
    setSearchMode(initialSearchMode);
    setIsSaving(false);
    setError(null);
    setIsComplete(false);
  }, [initialChatMode, initialName, initialPreferredName, initialSearchMode, initialTeamNumber, open]);

  // Each step should always open scrolled to its own top - the scroll area
  // is one shared element reused across steps, so without this it keeps
  // whichever offset the previous step's content left it at. Runs after the
  // new step's content has painted (rAF) so scrollTo isn't racing layout.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(handle);
  }, [open, step]);

  useEffect(() => {
    if (!open || isComplete) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      focusOnboardingField(step, chatMode);
    });

    return () => window.cancelAnimationFrame(handle);
  }, [chatMode, isComplete, open, step]);

  const parsedTeamNumber = useMemo(() => {
    if (isNoTeam || !teamNumberInput.trim()) {
      return null;
    }

    const value = Number(teamNumberInput);
    if (!Number.isInteger(value) || value < 1 || value > 99_999) {
      return Number.NaN;
    }

    return value;
  }, [isNoTeam, teamNumberInput]);

  const validateCurrentStep = () => {
    const trimmedName = preferredName.trim();

    if (step === 1) {
      if (!trimmedName) {
        setError("Enter the name Curator should call you.");
        return false;
      }

      if (trimmedName.length > 30) {
        setError("Preferred name must be 30 characters or fewer.");
        return false;
      }
    }

    if (step === 2 && Number.isNaN(parsedTeamNumber)) {
      setError("Enter a team number from 1 to 99999, or choose not on a team.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    // A held Enter key (or a fast double tap on Next before the step
    // re-renders) can otherwise fire this twice off one intended press and
    // skip a step.
    if (isNavigatingRef.current) {
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    isNavigatingRef.current = true;
    setStep((current) => Math.min(current + 1, STEP_COUNT));
    queueMicrotask(() => {
      isNavigatingRef.current = false;
    });
  };

  const handleComplete = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/account/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: preferredName.trim(),
          teamNumber: parsedTeamNumber,
          chatMode,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to finish onboarding.");
      }

      console.info("[chat-mode] changed", { to: chatMode, source: "onboarding" });
      setDefaultChatMode(chatMode);
      setDefaultSearchMode(searchMode);
      localStorage.setItem("curator:searchMode", searchMode);
      setIsComplete(true);
      onCompleted?.();

      try {
        await update({
          defaultChatMode: payload.defaultChatMode ?? chatMode,
          preferredName: payload.preferredName ?? preferredName.trim(),
          teamNumber: payload.teamNumber ?? parsedTeamNumber,
          onboardedAt: payload.onboardedAt ?? new Date().toISOString(),
        });
      } catch {
        router.refresh();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to finish onboarding.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    if (step === STEP_COUNT) {
      void handleComplete();
      return;
    }

    handleNext();
  };

  const stepTitle = step === 1
    ? "What should Curator call you?"
      : step === 2
        ? "What team are you on?"
        : step === 3
          ? "Choose your default chat mode"
          : "Choose your default search mode";

  const stepDescription = step === 1
    ? "This name appears in your saved account profile and is used in chat context."
      : step === 2
        ? "Your saved team number lets Curator pull The Blue Alliance context for your team."
        : step === 3
          ? "You can still change this later from Settings."
          : "Pick how much source gathering Curator should do by default.";

  return (
    <Dialog open={open && !isComplete} onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          // Outer layer becomes a plain keyboard/safe-area-bounded centering
          // box - the visible card is the inner div below. Radix portals this
          // to <body>, outside [data-capacitor-root], so it can't rely on
          // that container's own inset and reads --keyboard-height directly
          // (see app/globals.css and Providers.tsx's CapacitorKeyboard).
          "flex items-center justify-center gap-0 border-0 bg-transparent p-0 shadow-none",
          "left-0 right-0 w-full max-w-none translate-x-0",
          "top-[max(0.75rem,env(safe-area-inset-top))] bottom-[max(0.75rem,calc(env(safe-area-inset-bottom)+var(--keyboard-height,0px)))] translate-y-0 max-h-none",
          "transition-[bottom] duration-250 ease-out",
          "[&>button]:hidden"
        )}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusOnboardingField(step, chatMode);
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex max-h-full w-[calc(100%-2rem)] max-w-lg flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-float)]">
          <form className="contents" onSubmit={handleSubmit}>
          <div className="shrink-0 border-b border-border/60 px-6 py-5">
            <DialogHeader className="gap-2 text-left">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {step} of {STEP_COUNT}
              </div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {stepTitle}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-muted-foreground">
                {stepDescription}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div
            ref={scrollRef}
            data-testid="onboarding-scroll-area"
            onPointerDown={dismissKeyboardOnEmptyTap}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5"
          >
            {step === 1 ? (
              <div className="space-y-2">
                <label htmlFor="preferred-name" className="text-sm font-medium text-foreground">
                  Preferred name
                </label>
                <Input
                  id="preferred-name"
                  type="text"
                  value={preferredName}
                  maxLength={30}
                  placeholder="First name or nickname"
                  enterKeyHint="next"
                  autoComplete="given-name"
                  onChange={(event) => setPreferredName(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use your first name, nickname, or whatever you want Curator to use.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="team-number" className="text-sm font-medium text-foreground">
                    Team number
                  </label>
                  <Input
                    id="team-number"
                    type="number"
                    min={1}
                    max={99_999}
                    inputMode="numeric"
                    enterKeyHint="done"
                    autoComplete="off"
                    value={teamNumberInput}
                    placeholder="254"
                    disabled={isNoTeam}
                    onChange={(event) => setTeamNumberInput(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsNoTeam((current) => {
                      const next = !current;
                      if (next) {
                        setTeamNumberInput("");
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                    isNoTeam
                      ? "border-foreground/15 bg-muted text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <div>
                    <div className="text-sm font-medium">I&apos;m not on a team</div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      You can skip team-based TBA context for now.
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold",
                      isNoTeam
                        ? "border-foreground bg-foreground text-background"
                        : "border-border/70 bg-background text-transparent",
                    )}
                  >
                    ✓
                  </div>
                </button>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-3">
                {CHAT_MODE_OPTIONS.map((option) => {
                  const selected = chatMode === option.value;
                  return (
                    <button
                      key={option.value}
                      id={`chat-mode-${option.value}`}
                      type="button"
                      onClick={() => setChatMode(option.value)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition-colors",
                        selected
                          ? "border-foreground/15 bg-muted text-foreground shadow-[var(--shadow-card)]"
                          : "border-border/60 bg-background text-foreground hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{option.title}</div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/70 bg-background text-transparent",
                          )}
                        >
                          ✓
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-3">
                {SEARCH_MODE_OPTIONS.map((option) => {
                  const selected = searchMode === option.value;
                  return (
                    <button
                      key={option.value}
                      id={`search-mode-${option.value}`}
                      type="button"
                      onClick={() => setSearchMode(option.value)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition-colors",
                        selected
                          ? "border-foreground/15 bg-muted text-foreground shadow-[var(--shadow-card)]"
                          : "border-border/60 bg-background text-foreground hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{option.title}</div>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border/70 bg-background text-transparent",
                          )}
                        >
                          ✓
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-card px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((current) => Math.max(current - 1, 1))}
              disabled={step === 1 || isSaving}
            >
              Back
            </Button>
            <Button id="onboarding-next-step" type="submit" disabled={isSaving}>
              {step === STEP_COUNT ? (isSaving ? "Saving..." : "Get started") : "Next"}
            </Button>
          </DialogFooter>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
