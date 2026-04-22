# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step post-login onboarding modal (name, team number, chat mode), transfer the active guest conversation on login, and inject saved team data into TBA lookups.

**Architecture:** DB-driven (`onboarded_at` null = not onboarded), modal in ChatApp mirrors TosModal pattern, guest→auth transfer runs before `replaceConversations`, TBA files restored from git and extended with `userTeamNumber` option.

**Tech Stack:** Next.js App Router, Drizzle ORM (PostgreSQL), next-auth v5 (JWT), Zustand, Radix Dialog, TailwindCSS, TBA MCP stdio server.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/db/schema.ts` | Modify | Add `preferred_name`, `team_number`, `onboarded_at` to users |
| `types/next-auth.d.ts` | Modify | Extend Session + JWT types |
| `lib/account-settings.ts` | Modify | Return new fields from `readUserAccountSettings` |
| `auth.ts` | Modify | Load + forward new fields through JWT/session callbacks |
| `app/api/account/onboarding/route.ts` | Create | PATCH endpoint to save onboarding answers |
| `components/auth/OnboardingModal.tsx` | Create | 3-step non-dismissible Dialog |
| `lib/conversation-api.ts` | Modify | Add `transferGuestConversation` helper |
| `components/chat/ChatApp.tsx` | Modify | Show OnboardingModal, guest→auth transfer |
| `lib/tba-mcp-client.ts` | Restore | MCP stdio client for TBA server |
| `lib/tba.ts` | Restore + Modify | TBA context builder, add `userTeamNumber` option |
| `scripts/tba-mcp-server.mjs` | Restore | Node.js MCP server that calls TBA API |
| `.mcp.json` | Restore | MCP server registry |
| `lib/frc-system-prompt.ts` | Modify | Add `userContext` param (name + team) |
| `app/api/chat/route.ts` | Modify | Pass teamNumber to TBA, pass userContext to prompt |

---

## Task 1: Schema — add onboarding fields

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add three columns to the users table**

In `lib/db/schema.ts`, replace the users table definition with:

```typescript
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  defaultChatMode: text("default_chat_mode", { enum: ["rookie", "veteran"] }).notNull().default("veteran"),
  ipBanned: boolean("ip_banned").notNull().default(false),
  bannedIp: text("banned_ip"),
  preferredName: text("preferred_name"),
  teamNumber: integer("team_number"),
  onboardedAt: timestamp("onboarded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add preferred_name, team_number, onboarded_at to users schema"
```

---

## Task 2: Session types + account settings + auth callbacks

**Files:**
- Modify: `types/next-auth.d.ts`
- Modify: `lib/account-settings.ts`
- Modify: `auth.ts`

- [ ] **Step 1: Extend next-auth types**

Replace the full content of `types/next-auth.d.ts`:

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      isSuperAdmin: boolean;
      defaultChatMode: "rookie" | "veteran";
      preferredName: string | null;
      teamNumber: number | null;
      onboardedAt: Date | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    defaultChatMode?: "rookie" | "veteran";
    preferredName?: string | null;
    teamNumber?: number | null;
    onboardedAt?: Date | null;
  }
}
```

- [ ] **Step 2: Extend UserAccountSettings in account-settings.ts**

Replace `lib/account-settings.ts` with:

```typescript
import { db } from "@/lib/db";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ChatMode } from "@/lib/store";

export const DEFAULT_CHAT_MODE: ChatMode = "veteran";

type UserAccountSettings = {
  isAdmin: boolean;
  defaultChatMode: ChatMode;
  preferredName: string | null;
  teamNumber: number | null;
  onboardedAt: Date | null;
};

function isMissingColumn(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42703"
  );
}

export async function readUserAccountSettings(userId: string): Promise<UserAccountSettings> {
  try {
    const [row] = await db
      .select({
        isAdmin: users.isAdmin,
        defaultChatMode: users.defaultChatMode,
        preferredName: users.preferredName,
        teamNumber: users.teamNumber,
        onboardedAt: users.onboardedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      isAdmin: row?.isAdmin ?? false,
      defaultChatMode: row?.defaultChatMode ?? DEFAULT_CHAT_MODE,
      preferredName: row?.preferredName ?? null,
      teamNumber: row?.teamNumber ?? null,
      onboardedAt: row?.onboardedAt ?? null,
    };
  } catch (error) {
    if (!isMissingColumn(error)) throw error;

    const [row] = await db
      .select({ isAdmin: users.isAdmin })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      isAdmin: row?.isAdmin ?? false,
      defaultChatMode: DEFAULT_CHAT_MODE,
      preferredName: null,
      teamNumber: null,
      onboardedAt: null,
    };
  }
}

export async function readUserDefaultChatMode(
  session: { user?: { id?: string | null } } | null | undefined,
): Promise<ChatMode> {
  const userId = session?.user?.id;
  if (!userId) return DEFAULT_CHAT_MODE;

  try {
    const [row] = await withSessionDbAccess(session, (tx) => tx
      .select({ defaultChatMode: users.defaultChatMode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1));

    return row?.defaultChatMode ?? DEFAULT_CHAT_MODE;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return DEFAULT_CHAT_MODE;
  }
}
```

- [ ] **Step 3: Update auth.ts JWT + session callbacks**

In `auth.ts`, replace the `callbacks` block with:

```typescript
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;
      const email = user?.email ?? token.email;

      if ((user || trigger === "update") && token.id) {
        const settings = await readUserAccountSettings(token.id as string);
        token.isAdmin = settings.isAdmin;
        token.defaultChatMode = settings.defaultChatMode;
        token.preferredName = settings.preferredName;
        token.teamNumber = settings.teamNumber;
        token.onboardedAt = settings.onboardedAt;
      }

      if (isAdminEmail(email)) {
        token.isAdmin = true;
        token.isSuperAdmin = true;
        token.defaultChatMode ??= DEFAULT_CHAT_MODE;
        return token;
      }

      token.isSuperAdmin = false;
      token.defaultChatMode ??= DEFAULT_CHAT_MODE;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
        session.user.defaultChatMode =
          (token.defaultChatMode as "rookie" | "veteran" | undefined) ?? DEFAULT_CHAT_MODE;
        session.user.preferredName = (token.preferredName as string | null | undefined) ?? null;
        session.user.teamNumber = (token.teamNumber as number | null | undefined) ?? null;
        session.user.onboardedAt = (token.onboardedAt as Date | null | undefined) ?? null;
      }
      return session;
    },
  },
```

- [ ] **Step 4: Commit**

```bash
git add types/next-auth.d.ts lib/account-settings.ts auth.ts
git commit -m "feat: extend session JWT with preferredName, teamNumber, onboardedAt"
```

---

## Task 3: Onboarding API route

**Files:**
- Create: `app/api/account/onboarding/route.ts`

- [ ] **Step 1: Create the route**

Create `app/api/account/onboarding/route.ts`:

```typescript
import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const VALID_CHAT_MODES = new Set(["rookie", "veteran"]);

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { preferredName, teamNumber, chatMode } = body ?? {};

  if (
    typeof preferredName !== "string" ||
    preferredName.trim().length === 0 ||
    preferredName.trim().length > 30
  ) {
    return NextResponse.json({ error: "Invalid preferred name" }, { status: 400 });
  }

  if (!VALID_CHAT_MODES.has(chatMode)) {
    return NextResponse.json({ error: "Invalid chat mode" }, { status: 400 });
  }

  if (
    teamNumber !== null &&
    teamNumber !== undefined &&
    (typeof teamNumber !== "number" || teamNumber < 1 || teamNumber > 99999)
  ) {
    return NextResponse.json({ error: "Invalid team number" }, { status: 400 });
  }

  const [user] = await withSessionDbAccess(session, (tx) =>
    tx
      .update(users)
      .set({
        preferredName: preferredName.trim(),
        teamNumber: teamNumber ?? null,
        defaultChatMode: chatMode,
        onboardedAt: new Date(),
      })
      .where(eq(users.id, session.user.id))
      .returning({
        preferredName: users.preferredName,
        teamNumber: users.teamNumber,
        defaultChatMode: users.defaultChatMode,
        onboardedAt: users.onboardedAt,
      })
  );

  return NextResponse.json(user);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/account/onboarding/route.ts
git commit -m "feat: add PATCH /api/account/onboarding endpoint"
```

---

## Task 4: OnboardingModal component

**Files:**
- Create: `components/auth/OnboardingModal.tsx`

- [ ] **Step 1: Create the component**

Create `components/auth/OnboardingModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeftIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatMode } from "@/lib/store";

interface Props {
  open: boolean;
}

const TOTAL_STEPS = 3;

export function OnboardingModal({ open }: Props) {
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [preferredName, setPreferredName] = useState("");
  const [teamInput, setTeamInput] = useState("");
  const [noTeam, setNoTeam] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("veteran");
  const [loading, setLoading] = useState(false);

  const parsedTeam =
    teamInput && !noTeam ? parseInt(teamInput, 10) : null;
  const teamValid =
    noTeam ||
    !teamInput ||
    (parsedTeam !== null && parsedTeam >= 1 && parsedTeam <= 99999);
  const nameValid =
    preferredName.trim().length >= 1 && preferredName.trim().length <= 30;

  async function handleComplete() {
    setLoading(true);
    try {
      await fetch("/api/account/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferredName: preferredName.trim(),
          teamNumber: noTeam ? null : (parsedTeam ?? null),
          chatMode,
        }),
      });
      await update();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md rounded-2xl border-border/60 bg-card p-0 shadow-[var(--shadow-float)] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="border-b border-border/60 px-6 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 w-6 rounded-full transition-colors",
                    i + 1 <= step
                      ? "bg-foreground"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-lg font-semibold text-foreground">
              {step === 1 && "What should Curator call you?"}
              {step === 2 && "What's your team?"}
              {step === 3 && "How do you want Curator to talk?"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {step === 1 && "A first name or nickname works great."}
              {step === 2 && "Curator will use this to pull your team's live event data."}
              {step === 3 && "You can always change this later in Settings."}
            </p>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {step === 1 && (
            <Input
              autoFocus
              placeholder="First name or nickname"
              value={preferredName}
              maxLength={30}
              onChange={(e) => setPreferredName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nameValid) setStep(2);
              }}
              className="h-11 rounded-xl"
            />
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Input
                autoFocus
                placeholder="Team number (e.g. 1676)"
                value={noTeam ? "" : teamInput}
                disabled={noTeam}
                type="number"
                min={1}
                max={99999}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && teamValid) setStep(3);
                }}
                className="h-11 rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setNoTeam((v) => !v);
                  setTeamInput("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors",
                  noTeam
                    ? "border-foreground/30 bg-muted text-foreground"
                    : "border-border/50 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-colors",
                    noTeam ? "border-foreground bg-foreground" : "border-muted-foreground"
                  )}
                />
                I&apos;m not on a team
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "veteran" as ChatMode,
                    title: "Veteran",
                    description: "Technical language, no hand-holding. Assumes you know FRC.",
                  },
                  {
                    value: "rookie" as ChatMode,
                    title: "Rookie",
                    description: "Plain English, jargon explained. Great for new members.",
                  },
                ] as const
              ).map(({ value, title, description }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setChatMode(value)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    chatMode === value
                      ? "border-foreground/40 bg-muted"
                      : "border-border/50 hover:bg-muted/40"
                  )}
                >
                  <div className="text-sm font-semibold text-foreground">{title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center gap-2 pt-1">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep((s) => s - 1)}
                className="shrink-0 rounded-xl"
                disabled={loading}
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              className="flex-1 rounded-xl"
              disabled={
                loading ||
                (step === 1 && !nameValid) ||
                (step === 2 && !teamValid)
              }
              onClick={() => {
                if (step < TOTAL_STEPS) {
                  setStep((s) => s + 1);
                } else {
                  void handleComplete();
                }
              }}
            >
              {loading
                ? "Saving…"
                : step === TOTAL_STEPS
                ? "Get started"
                : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/OnboardingModal.tsx
git commit -m "feat: OnboardingModal 3-step Dialog (name, team, chat mode)"
```

---

## Task 5: Guest→auth transfer + wire OnboardingModal into ChatApp

**Files:**
- Modify: `lib/conversation-api.ts`
- Modify: `components/chat/ChatApp.tsx`

- [ ] **Step 1: Add transferGuestConversation to conversation-api.ts**

At the bottom of `lib/conversation-api.ts`, add:

```typescript
import type { Conversation } from "@/lib/store";

export async function transferGuestConversation(
  conversation: Conversation,
): Promise<string> {
  const created = await createConversation({
    title: conversation.title,
    seasonYear: conversation.seasonYear,
  });

  for (const message of conversation.messages) {
    if (message.role === "system") continue;
    await createConversationMessage(created.id, {
      id: message.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      citations: message.citations,
    });
  }

  return created.id;
}
```

- [ ] **Step 2: Update ChatApp imports**

At the top of `components/chat/ChatApp.tsx`, add `OnboardingModal` to imports:

```typescript
import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { transferGuestConversation } from "@/lib/conversation-api";
```

(Keep all existing imports.)

- [ ] **Step 3: Capture wasAuthenticated before ref update in ChatApp**

In the `useEffect` in `ChatApp.tsx`, change:

```typescript
  // BEFORE (lines ~118-122):
  if (previousAuthRef.current && !isAuthenticated) {
    clearAllConversations();
  }
  previousAuthRef.current = isAuthenticated;
```

To:

```typescript
  const wasAuthenticated = previousAuthRef.current;

  if (wasAuthenticated && !isAuthenticated) {
    clearAllConversations();
  }
  previousAuthRef.current = isAuthenticated;
```

- [ ] **Step 4: Add guest transfer inside bootstrap**

Inside `bootstrap`, right before the `isAuthenticated` block that calls `replaceConversations`, add a guest transfer check. Find the line `if (isAuthenticated) {` and insert above it:

```typescript
      if (isAuthenticated && !wasAuthenticated) {
        const activeId = useChatStore.getState().activeConversationId;
        const guestConv = useChatStore
          .getState()
          .conversations.find((c) => c.id === activeId);

        if (guestConv && guestConv.messages.length > 0) {
          try {
            const transferredId = await transferGuestConversation(guestConv);
            if (!cancelled) {
              // bootstrap will load it from server; stash id to navigate after load
              (bootstrap as unknown as { transferredId?: string }).transferredId =
                transferredId;
            }
          } catch {
            toast.error("Couldn't transfer your guest chat.");
          }
        }
      }
```

Then, inside the `isAuthenticated` block after `replaceConversations`, replace:

```typescript
          setActiveConversation(null);
          setPublicConversation(null);
          setViewMode("owner");
          router.replace("/");
          return;
```

With:

```typescript
          const tid = (bootstrap as unknown as { transferredId?: string }).transferredId;
          if (tid) {
            const loaded = await readConversation(tid);
            if (!cancelled && loaded?.access === "owner") {
              upsertConversation(loaded.conversation);
              setActiveConversation(loaded.conversation.id);
              setPublicConversation(null);
              setViewMode("owner");
              navigateToConversation(tid, true);
              return;
            }
          }

          setActiveConversation(null);
          setPublicConversation(null);
          setViewMode("owner");
          router.replace("/");
          return;
```

- [ ] **Step 5: Show OnboardingModal when onboardedAt is null**

Near the bottom of `ChatApp`, just before the `if (viewMode === "loading")` return, add:

```typescript
  const showOnboarding =
    status === "authenticated" && session?.user?.onboardedAt === null;
```

Then in the JSX return (the `SidebarProvider` block), wrap the existing content and add the modal:

```tsx
  return (
    <>
      <OnboardingModal open={showOnboarding} />
      <SidebarProvider defaultOpen={viewMode !== "public"}>
        {/* ...existing content unchanged... */}
      </SidebarProvider>
    </>
  );
```

- [ ] **Step 6: Commit**

```bash
git add lib/conversation-api.ts components/chat/ChatApp.tsx
git commit -m "feat: guest→auth chat transfer and wire OnboardingModal into ChatApp"
```

---

## Task 6: Restore TBA files and extend with userTeamNumber

**Files:**
- Restore: `lib/tba-mcp-client.ts`
- Restore + Modify: `lib/tba.ts`
- Restore: `scripts/tba-mcp-server.mjs`
- Restore: `.mcp.json`

- [ ] **Step 1: Restore files from git history**

```bash
git show 9212ff2:lib/tba-mcp-client.ts > lib/tba-mcp-client.ts
git show 9212ff2:scripts/tba-mcp-server.mjs > scripts/tba-mcp-server.mjs
git show 9212ff2:lib/tba.ts > lib/tba.ts
git show 9212ff2:.mcp.json > .mcp.json
```

- [ ] **Step 2: Add MY_TEAM_PATTERN and userTeamNumber to lib/tba.ts**

At the top of `lib/tba.ts`, after the existing `TEAM_PATTERN` line, add:

```typescript
const MY_TEAM_PATTERN = /\b(my|our)\s+(?:team|robot|bot)\b/i;
```

Change `TbaStatusOptions` to include the user's team:

```typescript
interface TbaStatusOptions {
  onStatus?: (message: string) => void;
  userTeamNumber?: number | null;
}
```

Inside `buildTbaContext`, replace the team extraction block:

```typescript
  // BEFORE:
  const teamMatch = query.match(TEAM_PATTERN);
  // ...
  const teamNumber = teamMatch ? Number(teamMatch[1]) : null;
  const teamKey = teamNumber ? getTeamKey(teamNumber) : null;
```

With:

```typescript
  const teamMatch = query.match(TEAM_PATTERN);
  const hasMyTeamRef = MY_TEAM_PATTERN.test(query);
  const resolvedTeamNumber =
    teamMatch
      ? Number(teamMatch[1])
      : hasMyTeamRef && options?.userTeamNumber
        ? options.userTeamNumber
        : null;
  const teamNumber = resolvedTeamNumber;
  const teamKey = teamNumber ? getTeamKey(teamNumber) : null;
```

- [ ] **Step 3: Commit**

```bash
git add lib/tba-mcp-client.ts lib/tba.ts scripts/tba-mcp-server.mjs .mcp.json
git commit -m "feat: restore TBA files and extend buildTbaContext with userTeamNumber"
```

---

## Task 7: System prompt — user context injection

**Files:**
- Modify: `lib/frc-system-prompt.ts`

- [ ] **Step 1: Add {{USER_CONTEXT}} placeholder and userContext param**

In `lib/frc-system-prompt.ts`, change the end of the `BASE` template from:

```typescript
Current season year: {{SEASON_YEAR}}{{CONTEXT_BLOCK}}`;
```

To:

```typescript
Current season year: {{SEASON_YEAR}}{{USER_CONTEXT}}{{CONTEXT_BLOCK}}`;
```

Add a helper function before `buildSystemPrompt`:

```typescript
function buildUserContextBlock(
  preferredName?: string | null,
  teamNumber?: number | null,
): string {
  const parts: string[] = [];
  if (preferredName) {
    parts.push(`The user's name is ${preferredName}. Address them by name occasionally, but not in every message.`);
  }
  if (teamNumber) {
    parts.push(`The user is a member of FRC team ${teamNumber}.`);
  }
  return parts.length > 0 ? `\n${parts.join(" ")}` : "";
}
```

Update `buildSystemPrompt` signature and body:

```typescript
export function buildSystemPrompt(
  seasonYear: number,
  contextBlock = "",
  chatMode: "rookie" | "veteran" = "veteran",
  userContext?: { preferredName?: string | null; teamNumber?: number | null },
): string {
  const base = BASE
    .replace("{{SEASON_YEAR}}", seasonYear.toString())
    .replace(
      "{{USER_CONTEXT}}",
      buildUserContextBlock(userContext?.preferredName, userContext?.teamNumber),
    )
    .replace("{{CONTEXT_BLOCK}}", contextBlock);
  return chatMode === "rookie" ? base + ROOKIE_SUFFIX : base;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/frc-system-prompt.ts
git commit -m "feat: inject preferred name and team number into system prompt"
```

---

## Task 8: Wire TBA + user context into chat route

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: Add TBA imports**

At the top of `app/api/chat/route.ts`, add after existing imports:

```typescript
import { buildTbaContext, isTbaMcpEnabled, shouldRunTbaLookup } from "@/lib/tba";
```

- [ ] **Step 2: Extract userTeamNumber and preferredName from session**

Inside the `POST` handler, after the `const { messages, temperature, seasonYear, chatMode } = await request.json();` line, add:

```typescript
  const userTeamNumber = session?.user?.teamNumber ?? null;
  const userPreferredName = session?.user?.preferredName ?? null;
```

- [ ] **Step 3: Add TBA context fetch after RAG/web blocks**

Inside the `stream`'s `start` callback, after the web search block and before the `buildSystemPrompt` call, add a TBA lookup block. Find the comment / line where `answerInputs` is built and insert before it:

```typescript
          const tbaCitations: Citation[] = [];

          if (
            lastUser &&
            isTbaMcpEnabled() &&
            (shouldRunTbaLookup(lastUser.content) ||
              (userTeamNumber &&
                /\b(my|our)\s+(?:team|robot|bot)\b/i.test(lastUser.content)))
          ) {
            try {
              sendEvent({ type: "status", message: "Checking live event data on The Blue Alliance..." });
              const tbaContext = await buildTbaContext(
                lastUser.content,
                effectiveSeasonYear,
                {
                  onStatus: (message) => sendEvent({ type: "status", message }),
                  userTeamNumber,
                },
              );
              if (tbaContext.contextBlock) {
                contextBlock += tbaContext.contextBlock;
              }
              if (tbaContext.directAnswer) {
                sendEvent({ type: "status", message: tbaContext.directAnswer });
              }
              tbaCitations.push(...tbaContext.citations);
            } catch {
              sendEvent({ type: "status", message: "Live event data unavailable, continuing without it..." });
            }
          }
```

- [ ] **Step 4: Pass userContext to buildSystemPrompt**

Replace the existing `buildSystemPrompt` call:

```typescript
          // BEFORE:
          const systemPrompt = buildSystemPrompt(effectiveSeasonYear, contextBlock, chatMode);
```

With:

```typescript
          const systemPrompt = buildSystemPrompt(
            effectiveSeasonYear,
            contextBlock,
            chatMode,
            { preferredName: userPreferredName, teamNumber: userTeamNumber },
          );
```

- [ ] **Step 5: Include TBA citations in filterUsedCitations**

Replace the `filterUsedCitations` call:

```typescript
          // BEFORE:
          sendEvent({
            type: "citations",
            citations: filterUsedCitations(assistantText, ragCitations, webCitations),
          });
```

With:

```typescript
          sendEvent({
            type: "citations",
            citations: filterUsedCitations(
              assistantText,
              ragCitations,
              [...webCitations, ...tbaCitations],
            ),
          });
```

- [ ] **Step 6: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: inject TBA live context and user identity into chat completions"
```

---

## Task 9: Run database migration

- [ ] **Step 1: Push schema to database**

```bash
npx drizzle-kit push
```

Expected output: confirmation that `preferred_name`, `team_number`, `onboarded_at` columns were added to the `users` table. If asked to confirm destructive changes, answer `yes` only for the column additions (no drops should be needed).

- [ ] **Step 2: Verify columns exist**

```bash
npx drizzle-kit studio
```

Or check directly in psql:

```bash
psql $DATABASE_URL -c "\d users"
```

Expected: columns `preferred_name text`, `team_number integer`, `onboarded_at timestamp` visible in the table.

- [ ] **Step 3: Commit**

```bash
git add lib/db/migrations/
git commit -m "chore: apply migration — add preferred_name, team_number, onboarded_at to users"
```
