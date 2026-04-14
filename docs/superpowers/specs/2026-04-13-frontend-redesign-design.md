# CURATOR Frontend Redesign — Design Spec
**Date:** 2026-04-13
**Status:** Approved

## Overview

Complete frontend redesign of the CURATOR AI chatroom (FRC robotics assistant) to achieve a clean, modern AI chat aesthetic matching tools like Claude.ai and Perplexity. Keeps FRC FIRST branding (blue `#0066B3` / red `#ED1C24`), light + dark theme toggle, and retains existing Zustand `persist` localStorage for conversation storage (no changes to data layer).

## Architecture

Use shadcn's `SidebarProvider` + `Sidebar` primitives as the structural backbone, replacing the current hand-rolled Framer Motion width animation. Wrap the app in `SidebarProvider` at the page level.

**Layout tree:**
```
SidebarProvider
├── AppSidebar (shadcn Sidebar)
│   ├── SidebarHeader — "FRC / CURATOR" wordmark + season badge
│   ├── SidebarContent — conversation list via SidebarMenu/SidebarMenuButton
│   └── SidebarFooter — model badge, settings button, theme toggle
├── SidebarInset (main content area, flex-col h-screen)
│   ├── ChatHeader (sticky top) — SidebarTrigger + conversation title + clear button
│   ├── MessageList (flex-1 overflow-y-auto) — max-w-3xl mx-auto centered column
│   └── InputArea (sticky bottom) — floating rounded-xl card
└── SettingsModal (shadcn Dialog, unchanged logic)
```

## Components

### AppSidebar (`components/sidebar/Sidebar.tsx`)
- Complete rewrite using shadcn `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`
- Header: `FRC` in FRC blue, `/` in FRC red, `CURATOR` in foreground — same wordmark
- New Chat: full-width `SidebarMenuButton` styled as primary (FRC blue bg, white text, rounded-lg)
- Conversation items: `SidebarMenuButton` with `isActive` prop, trash icon appears on hover only via group-hover
- Footer: green dot + model name pill, Settings button, ThemeToggle

### ChatWindow (`components/chat/ChatWindow.tsx`)
- Replace outer div with `SidebarInset`
- Sticky header: `SidebarTrigger` + conversation title + clear button
- Message list: `max-w-3xl mx-auto px-4 py-6` centered column

### MessageBubble (`components/chat/MessageBubble.tsx`)
- User messages: right-aligned, **no bubble background** — plain text with a subtle left-border or right-aligned layout. FRC blue for user label/avatar.
- Assistant messages: left-aligned, full-width within column, no bubble — markdown rendered directly on background
- Both: small `User` / `Bot` icon avatars (24px circle)
- Code blocks: always-dark background, language label top-left, copy button top-right
- Streaming cursor: blinking `|` inline after last character

### InputBar (`components/chat/InputBar.tsx`)
- Floating card: `rounded-xl border bg-card shadow-sm` with padding
- Auto-growing textarea (1–6 rows, no manual resize)
- Send button: FRC red (`#ED1C24`) when `canSend`, muted otherwise; shows stop square icon while streaming
- Below card: token count + "↵ send · ⇧↵ newline" hint text, centered

### EmptyState (`components/chat/EmptyState.tsx`)
- Centered vertically and horizontally in message list
- CURATOR wordmark + tagline ("Your FRC knowledge assistant")
- 4 suggested prompt chips as `Button variant="outline"` in a 2×2 grid

### ThemeToggle (`components/ui/ThemeToggle.tsx`)
- `Sun` / `Moon` lucide icon button, `next-themes` `useTheme`, no changes to logic

## Styling

- Keep existing CSS variable palette in `globals.css` (light + dark tokens already correct)
- Tighten base styles: remove custom `.input-focus` hack, use shadcn's built-in focus ring
- Message layout uses standard Tailwind flex/grid, no custom CSS classes beyond `prose-chat`
- FRC blue drives: primary button bg, active sidebar item, user avatar accent, link color
- FRC red drives: send button when active, destructive actions, the `/` in the wordmark

## Data Layer

No changes. Zustand `persist` middleware already saves to `localStorage` under `curator-chat-store`. All store actions (`newConversation`, `addMessage`, `deleteConversation`, etc.) remain identical.

## Files to Modify

| File | Action |
|------|--------|
| `app/page.tsx` | Wrap in `SidebarProvider`, remove custom mobile overlay |
| `components/sidebar/Sidebar.tsx` | Complete rewrite with shadcn Sidebar |
| `components/sidebar/ConversationItem.tsx` | Rewrite using `SidebarMenuButton` |
| `components/chat/ChatWindow.tsx` | Replace outer div with `SidebarInset`, update header |
| `components/chat/MessageBubble.tsx` | Remove bubble bg from user messages, clean up layout |
| `components/chat/InputBar.tsx` | Floating card treatment, clean up token hint |
| `components/chat/EmptyState.tsx` | New centered layout with prompt chips |
| `app/globals.css` | Remove `.input-focus` hack, tighten utilities |

## Out of Scope

- No changes to API layer (`lib/openrouter.ts`, `lib/frc-system-prompt.ts`)
- No changes to data store (`lib/store.ts`)
- No new shadcn components beyond what's already installed + Sidebar
- No animation overhaul (keep existing Framer Motion where it adds value)
