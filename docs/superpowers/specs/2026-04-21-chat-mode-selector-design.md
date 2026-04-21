# Chat Mode Selector — Design Spec

**Date:** 2026-04-21
**Status:** Approved

## Overview

Add a ChatGPT-style mode selector to the Curator chat header. Two modes: **Veteran** (default, current behavior) for FRC members who know the terminology, and **Rookie** for parents, siblings, and first-year students who need plain-English explanations.

## Modes

| Mode | Audience | System prompt change |
|------|----------|----------------------|
| Veteran | FRC members, mentors, students | None — current behavior unchanged |
| Rookie | Parents, newcomers, first-year students | Appends plain-English language guide (see below) |

### Rookie language guide suffix

```
LANGUAGE MODE: PLAIN ENGLISH
You are talking to someone new to FRC — a parent, sibling, or first-year student. Follow these rules:
- Use everyday words. Never assume the reader knows FRC jargon.
- Always define a term the first time you use it, e.g. "the intake (the mechanism that picks up game pieces)".
- Preferred substitutions: game pieces → balls/cubes/whatever they physically look like, autonomous → the robot drives itself, alliance → your team's group of 3 robots, field element names → describe them physically.
- Keep sentences short. Avoid acronyms unless spelled out first (e.g. "FIRST Robotics Competition (FRC)").
- Friendly, encouraging tone — never condescending.
```

## State & Data Flow

### Zustand store changes (`lib/store.ts`)

- Add `defaultChatMode: "rookie" | "veteran"` — global preference, persisted to localStorage, initial value `"veteran"`
- Add `chatMode: "rookie" | "veteran"` to the `Conversation` type — set to `defaultChatMode` at conversation creation
- Add actions:
  - `setConversationChatMode(conversationId, mode)` — updates mode on a specific conversation AND updates `defaultChatMode`

### API changes (`app/api/chat/route.ts`)

- Accept `chatMode: "rookie" | "veteran"` in the request body (defaults to `"veteran"` if absent)
- Pass `chatMode` to `buildSystemPrompt`

### System prompt changes (`lib/frc-system-prompt.ts`)

- `buildSystemPrompt(seasonYear, contextBlock, chatMode)` — appends Rookie suffix when `chatMode === "rookie"`, no change for `"veteran"`

### Client changes (`lib/openrouter.ts` or equivalent)

- Include `chatMode` in the payload sent to `/api/chat`

## UI

### Mode selector component (`components/chat/ChatModeSelector.tsx`)

- Dropdown button using existing `DropdownMenu` shadcn component
- Shows current mode name + chevron icon
- Desktop: label + chevron. Mobile: icon only + chevron (compact)
- Styling: matches existing header badge style (border, muted bg, small text)
- Options in dropdown:
  - Veteran (with checkmark if active)
  - Rookie (with checkmark if active)

### Placement (`components/chat/ChatWindow.tsx`)

- Inserted in the header row, left of the Share button
- Only shown when `!readOnly` (hidden in public read-only view)

## Behavior

- **Default mode:** Veteran
- **New conversations:** inherit `defaultChatMode` at creation time
- **Mid-conversation switch:** affects new messages only; past messages unaffected
- **Mode persistence:** stored per-conversation in Zustand (localStorage). No DB migration needed.
- **Global preference:** switching mode updates `defaultChatMode` so all future new chats start in the last-used mode

## Files to Create

- `components/chat/ChatModeSelector.tsx` — new dropdown component

## Files to Modify

- `lib/store.ts` — add `defaultChatMode`, `chatMode` on Conversation, `setConversationChatMode` action
- `lib/frc-system-prompt.ts` — add `chatMode` param, append Rookie suffix
- `app/api/chat/route.ts` — accept and forward `chatMode`
- `lib/openrouter.ts` — send `chatMode` in payload
- `components/chat/ChatWindow.tsx` — render `ChatModeSelector` in header, pass mode to `sendMessage`
