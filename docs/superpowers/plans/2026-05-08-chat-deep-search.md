# Chat Deep Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make normal chat responses faster while adding an opt-in Deep search mode in the input menu that performs broader PDF, web, and live-data tool gathering.

**Architecture:** Add a client-side `deepSearch` setting persisted in localStorage and passed to `/api/chat`. The backend skips the tool loop in normal mode and uses an expanded, budgeted agent tool loop in deep mode. Dropdown checkbox items prevent default select behavior so the menu remains open after toggles.

**Tech Stack:** Next.js App Router route handler, React 19 client components, Radix/shadcn dropdown menu, Vitest.

---

### Task 1: Add request-level search depth plumbing

**Files:**
- Modify: `lib/openrouter.ts`
- Modify: `components/chat/ChatWindow.tsx`
- Modify: `components/chat/InputBar.tsx`
- Test: `tests/input-bar.test.tsx`

- [x] Write failing tests asserting the input menu renders both Fact check and Deep search options.
- [x] Add `deepSearch?: boolean` to the client chat request payload.
- [x] Persist `curator:deepSearch` in `ChatWindow` and pass it to `InputBar`.
- [x] Add `deepSearchEnabled` and `onDeepSearchChange` props to `InputBar`.
- [x] Prevent checkbox menu select defaults so toggles do not close the menu.

### Task 2: Make normal chat skip the slow tool loop

**Files:**
- Modify: `app/api/chat/route.ts`
- Test: `tests/chat-search-options.test.ts`

- [x] Extract request option parsing into testable helpers.
- [x] Add tests for default fast mode and explicit deep mode.
- [x] Only run `runToolLoop` when `deepSearch` is true.
- [x] Keep fact check available when deep search gathered document context.

### Task 3: Expand deep-search agent loop safely

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `lib/rag.ts`
- Test: `tests/chat-search-options.test.ts`

- [x] Add configurable deep-search iteration and document limits.
- [x] Raise deep PDF search per-call limit while keeping a server-side clamp.
- [x] Execute multiple tool calls from the same assistant turn concurrently.
- [x] Detect web search rate limits and tell the model to stop web_search calls.
- [x] Stop on client abort, model completion, max iterations, or time budget.

### Task 4: Verify and polish

**Files:**
- `public/terms-of-service.md`
- `public/privacy-policy.md`

- [x] Review legal docs for whether existing web/search service disclosure already covers this behavior.
- [x] Run targeted tests.
- [x] Run full tests or lint/build if targeted changes pass.
