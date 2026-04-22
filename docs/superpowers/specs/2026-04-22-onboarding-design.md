# Onboarding Flow — Design Spec
_Last updated: 2026-04-22_

## Overview

First-login onboarding collects preferred name, FRC team number, and chat mode preference from new authenticated users. A guest→auth chat transfer preserves the active conversation when a guest signs in. TBA smart-inject uses the saved team number to enrich AI answers with live event/standings context.

---

## 1. Schema

Three new columns on `users`:

| Column | Type | Nullable | Purpose |
|---|---|---|---|
| `preferred_name` | `text` | yes | What Curator calls the user |
| `team_number` | `integer` | yes | FRC team number; null = no team |
| `onboarded_at` | `timestamp` | yes | null = hasn't completed onboarding |

Migration applied via `drizzle-kit push` after schema update.

Session JWT extended with `preferredName`, `teamNumber`, `onboardedAt` so the client avoids an extra round-trip.

---

## 2. Onboarding Modal

**Trigger**: `ChatApp` checks `session.user.onboardedAt === null` when `status === "authenticated"`. Opens a non-dismissible `Dialog` (same pattern as `TosModal`). Never opens for guests or while session is loading.

**Steps**:

1. **Preferred name** — text input, required, max 30 chars, placeholder "First name or nickname"
2. **Team number** — integer input (1–99999) with a "I'm not on a team" toggle; optional
3. **Chat mode** — two large cards: Rookie vs Veteran; defaults to Veteran selected

**Navigation**: step counter ("1 of 3"), Back button on steps 2+, Next on 1–2, "Get started" on step 3.

**Styling**: matches existing modal design language — `border-border/60 bg-card rounded-2xl shadow-[var(--shadow-float)]`, `[&>button]:hidden`, escape + outside-click blocked.

**On complete**: PATCH `/api/account/onboarding` with `{ preferredName, teamNumber, chatMode }`. Server sets `onboarded_at = NOW()`. Client calls `update()` from `useSession` to refresh JWT. Modal closes.

---

## 3. Guest → Auth Chat Transfer

**Trigger**: `ChatApp` detects `isAuthenticated` transitioning `false → true` (via existing `previousAuthRef`).

**Scope**: active conversation only (`useChatStore.getState().activeConversationId`). Skip if no active conversation or zero messages.

**Sequence**:
1. Grab active guest conversation from Zustand before `bootstrap()` runs
2. POST to `/api/conversations` to create server-side record
3. POST messages to `/api/conversations/:id/messages`
4. Run normal `bootstrap()` — loads full server conversation list
5. Navigate to the transferred conversation ID

**Failures**: log error, show toast "Couldn't transfer your guest chat", continue bootstrap normally.

---

## 4. New API Route: `/api/account/onboarding`

**Method**: `PATCH`  
**Auth**: required  
**Body**: `{ preferredName: string, teamNumber: number | null, chatMode: "rookie" | "veteran" }`  
**Action**: updates `preferred_name`, `team_number`, `default_chat_mode`, `onboarded_at = NOW()` on the user row  
**Response**: `{ preferredName, teamNumber, defaultChatMode, onboardedAt }`

---

## 5. TBA Smart Inject

**Files restored** from commit `9212ff2`: `lib/tba.ts`, `lib/tba-mcp-client.ts`, `scripts/tba-mcp-server.mjs`.

**Gate**: `TBA_MCP_ENABLED=true` env var. If unset, TBA calls are skipped silently.

**Logic in `/api/chat/route.ts`**:
- Read `session.user.teamNumber`
- If `shouldRunTbaLookup(lastUserMessage)` is true AND `teamNumber` is set, fetch team's current event, rankings, and recent match results
- Inject as `contextBlock` alongside RAG/web results with TBA citations

**System prompt change**: `buildSystemPrompt` gains optional `userContext` param injected before rules:
```
User's name: {{PREFERRED_NAME}}
User's team: FRC {{TEAM_NUMBER}}
```
Only injected when values are present.

---

## 6. Session/JWT Extensions

`types/next-auth.d.ts` and `auth.ts` extended:
- `token.preferredName` — string | null
- `token.teamNumber` — number | null
- `token.onboardedAt` — Date | null

Loaded in the `jwt` callback alongside existing `isAdmin` / `defaultChatMode` via `readUserAccountSettings`.

---

## 7. Out of Scope

- Editing onboarding answers post-onboarding (handled in existing Settings modal)
- Bulk guest chat transfer (only active conversation)
- TBA inject when `TBA_MCP_ENABLED` is unset
