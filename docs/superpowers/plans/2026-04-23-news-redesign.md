# News Section Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone `/blog` pages with a "News" section that lives inside the main chat layout — sidebar stays visible, news index and articles open in the same shell that chat uses.

**Architecture:** Create a Next.js `(main)` route group that owns the shared `SidebarProvider` + `AppSidebar` shell. Extract sidebar action callbacks from `ChatApp` into a `useSidebarActions` hook so `AppSidebar` becomes self-contained. `ChatApp` shrinks to just `ChatWindow` + bootstrap effects. News pages render inside the same shell via `SidebarInset`.

**Tech Stack:** Next.js App Router route groups, Zustand, framer-motion, shadcn Sidebar primitives, `usePathname` / `useSearchParams` (Next.js), localStorage for unread badge, `lib/blog.ts` (unchanged), `BlogMarkdown` (unchanged).

---

## File Map

**New files:**
- `hooks/useSidebarActions.ts` — five sidebar action callbacks extracted from ChatApp
- `components/news/NewsBadge.tsx` — unread dot badge (localStorage vs latest post date)
- `components/MainLayout.tsx` — client shell (SidebarProvider + AppSidebar + children div)
- `app/(main)/layout.tsx` — server layout: fetches latestNewsPublishedAt, renders MainLayout
- `app/(main)/page.tsx` — chat root (copy of current app/page.tsx)
- `app/(main)/c/[id]/page.tsx` — conversation page (copy of current app/c/[id]/page.tsx)
- `app/(main)/news/page.tsx` — news index (server component)
- `app/(main)/news/[slug]/page.tsx` — article view (server component)

**Modified files:**
- `lib/store.ts` — add `shareDialogConversationId: string | null` + setter
- `components/sidebar/Sidebar.tsx` — remove prop callbacks, use hook, add News button + NewsBadge + usePathname active state
- `components/chat/ChatApp.tsx` — remove SidebarProvider + AppSidebar + 5 handlers; read shareDialogConversationId from store
- `next.config.ts` — add permanent /blog → /news redirects
- `app/sitemap.ts` — update /blog → /news URLs

**Deleted files:**
- `app/page.tsx` (replaced by `app/(main)/page.tsx`)
- `app/c/[id]/page.tsx` (replaced by `app/(main)/c/[id]/page.tsx`)
- `app/blog/page.tsx`
- `app/blog/[slug]/page.tsx`

---

## Task 1: Add shareDialogConversationId to Zustand store

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Read the current store interface and state**

Open `lib/store.ts`. Find the `interface ChatStore` block. It currently has `settingsOpen: boolean` and `setSettingsOpen`. Add two fields.

- [ ] **Step 2: Add fields to the interface**

In `lib/store.ts`, in the `interface ChatStore` block after `setSettingsOpen`:

```ts
shareDialogConversationId: string | null;
setShareDialogConversationId: (id: string | null) => void;
```

- [ ] **Step 3: Add initial state and implementation**

In the `create(...)` call, find the initial state object (where `settingsOpen: false` is set). Add:

```ts
shareDialogConversationId: null,
```

Find the `setSettingsOpen` implementation and add below it:

```ts
setShareDialogConversationId: (id) => set({ shareDialogConversationId: id }),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing ones unrelated to store).

- [ ] **Step 5: Commit**

```bash
git add lib/store.ts
git commit -m "feat(store): add shareDialogConversationId for sidebar-driven share trigger"
```

---

## Task 2: Create useSidebarActions hook

**Files:**
- Create: `hooks/useSidebarActions.ts`

This hook internalizes the five conversation callbacks previously passed as props to `AppSidebar`. It uses `useRouter`, `useSession`, `useChatStore`, and the conversation API.

- [ ] **Step 1: Create the hook file**

```ts
// hooks/useSidebarActions.ts
"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  deleteConversation as deleteConversationRequest,
  fetchConversation,
  fetchConversationMessages,
  updateConversation as updateConversationRequest,
} from "@/lib/conversation-api";
import { normalizeConversation, normalizeMessage } from "@/lib/conversations";
import { useChatStore } from "@/lib/store";

export function useSidebarActions() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;
  const {
    setActiveConversation,
    upsertConversation,
    deleteConversation,
    setShareDialogConversationId,
  } = useChatStore();

  const createConversation = useCallback(async () => {
    setActiveConversation(null);
    router.push("/");
  }, [router, setActiveConversation]);

  const openConversation = useCallback(async (conversationId: string) => {
    try {
      if (isAuthenticated) {
        const detail = await fetchConversation(conversationId);
        if (!detail || detail.access !== "owner") {
          toast.error("Unable to open that chat.");
          return;
        }
        const messageRows = await fetchConversationMessages(conversationId);
        const conversation = normalizeConversation(
          detail.conversation,
          (messageRows ?? []).map((m) => normalizeMessage(m)),
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(conversation);
        setActiveConversation(conversation.id);
      } else {
        setActiveConversation(conversationId);
      }
      router.push(`/c/${conversationId}`);
    } catch {
      toast.error("Unable to open that chat.");
    }
  }, [isAuthenticated, router, setActiveConversation, upsertConversation]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    const current = useChatStore.getState().conversations.find((c) => c.id === conversationId);
    if (!current || current.title === nextTitle) return;

    upsertConversation({ ...current, title: nextTitle, updatedAt: new Date() });

    try {
      if (isAuthenticated) {
        const updated = normalizeConversation(
          await updateConversationRequest(conversationId, { title: nextTitle }),
          current.messages,
          useChatStore.getState().defaultChatMode,
        );
        upsertConversation(updated);
      }
    } catch {
      upsertConversation(current);
      toast.error("Unable to rename that chat.");
    }
  }, [isAuthenticated, upsertConversation]);

  const deleteConversationAction = useCallback(async (conversationId: string) => {
    const currentActiveId = useChatStore.getState().activeConversationId;
    const remaining = useChatStore.getState().conversations.filter((c) => c.id !== conversationId);

    try {
      if (isAuthenticated) {
        await deleteConversationRequest(conversationId);
      }
      deleteConversation(conversationId);

      if (currentActiveId === conversationId) {
        if (remaining[0]) {
          setActiveConversation(remaining[0].id);
          router.push(`/c/${remaining[0].id}`);
        } else {
          setActiveConversation(null);
          router.push("/");
        }
      }
    } catch {
      toast.error("Unable to delete that chat.");
    }
  }, [deleteConversation, isAuthenticated, router, setActiveConversation]);

  const shareConversation = useCallback(async (conversationId: string) => {
    if (!isAuthenticated) {
      toast.info("Sign in to share chats.");
      return;
    }
    try {
      const detail = await fetchConversation(conversationId);
      if (!detail || detail.access !== "owner") {
        toast.error("Unable to open that chat.");
        return;
      }
      const messageRows = await fetchConversationMessages(conversationId);
      const conversation = normalizeConversation(
        detail.conversation,
        (messageRows ?? []).map((m) => normalizeMessage(m)),
        useChatStore.getState().defaultChatMode,
      );
      upsertConversation(conversation);
      setActiveConversation(conversation.id);
      setShareDialogConversationId(conversationId);
      router.push(`/c/${conversationId}`);
    } catch {
      toast.error("Unable to open that chat.");
    }
  }, [isAuthenticated, router, setActiveConversation, setShareDialogConversationId, upsertConversation]);

  return {
    createConversation,
    openConversation,
    renameConversation,
    deleteConversation: deleteConversationAction,
    shareConversation,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useSidebarActions.ts
git commit -m "feat(hooks): add useSidebarActions to internalize sidebar callbacks"
```

---

## Task 3: Create NewsBadge component

**Files:**
- Create: `components/news/NewsBadge.tsx`

Client component that reads `lastSeenNewsAt` from localStorage and shows a dot when there are unread posts. Clears when the user is on `/news`.

- [ ] **Step 1: Create the component**

```tsx
// components/news/NewsBadge.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lastSeenNewsAt";

interface NewsBadgeProps {
  latestPublishedAt: string | null;
}

export function NewsBadge({ latestPublishedAt }: NewsBadgeProps) {
  const pathname = usePathname();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!latestPublishedAt) {
      setHasUnread(false);
      return;
    }

    if (pathname === "/news") {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      setHasUnread(false);
      return;
    }

    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (!lastSeen) {
      setHasUnread(true);
      return;
    }

    setHasUnread(new Date(latestPublishedAt).getTime() > Number(lastSeen));
  }, [latestPublishedAt, pathname]);

  if (!hasUnread) return null;

  return (
    <span className="ml-auto flex size-2 shrink-0 rounded-full bg-blue-400" aria-label="New posts" />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/news/NewsBadge.tsx
git commit -m "feat(news): add NewsBadge for unread indicator"
```

---

## Task 4: Refactor AppSidebar — internalize callbacks, add News button

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`

Remove the five callback props. Use `useSidebarActions()`. Add a "News" `SidebarMenuButton` with the `NewsBadge`. Use `usePathname()` for active state on the News item.

- [ ] **Step 1: Add new imports**

At the top of `components/sidebar/Sidebar.tsx`, add:

```ts
import { usePathname } from "next/navigation";
import { NewspaperIcon } from "lucide-react"; // already imported? check and add if missing
import { useSidebarActions } from "@/hooks/useSidebarActions";
import { NewsBadge } from "@/components/news/NewsBadge";
```

Also add `NewspaperIcon` to the existing lucide-react import if not already there.

- [ ] **Step 2: Update the AppSidebarProps interface**

Replace the current `AppSidebarProps` interface:

```ts
interface AppSidebarProps {
  latestNewsPublishedAt: string | null;
}
```

- [ ] **Step 3: Update the component signature and wire actions**

Replace the function signature and add hook usage at the top of the component body:

```ts
export function AppSidebar({ latestNewsPublishedAt }: AppSidebarProps) {
  const pathname = usePathname();
  const {
    createConversation,
    openConversation,
    renameConversation,
    shareConversation,
    deleteConversation,
  } = useSidebarActions();
  // ... rest of existing state hooks unchanged
```

- [ ] **Step 4: Replace all prop callback references**

In the component body, replace:
- `void onCreateConversation()` → `void createConversation()`
- `void onOpenConversation(conv.id)` → `void openConversation(conv.id)`
- `onRename={(title) => void onRenameConversation(conv.id, title)}` → `onRename={(title) => void renameConversation(conv.id, title)}`
- `void onShareConversation(conv.id)` → `void shareConversation(conv.id)`
- `void onDeleteConversation(id)` → `void deleteConversation(id)`
- `handleDeleteOne` function can be removed; replace its usage with `void deleteConversation(id)` directly

- [ ] **Step 5: Add News button to SidebarContent, after the Search button**

In the `<SidebarMenu className="space-y-2">` section (after the Search `SidebarMenuItem`), add:

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    asChild
    isActive={pathname.startsWith("/news")}
    className="h-9 justify-start gap-2.5 rounded-xl border border-sidebar-border px-4 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/60 data-[active=true]:text-sidebar-foreground"
    tooltip="News"
  >
    <a href="/news" onClick={(e) => { e.preventDefault(); router.push(`/news?from=${useChatStore.getState().activeConversationId ? `/c/${useChatStore.getState().activeConversationId}` : "/"}`); setOpenMobile(false); }}>
      <NewspaperIcon className="size-4" />
      <span className="font-medium">News</span>
      <NewsBadge latestPublishedAt={latestNewsPublishedAt} />
    </a>
  </SidebarMenuButton>
</SidebarMenuItem>
```

Wait — `SidebarMenuButton asChild` with an `<a>` and an onClick that calls `router.push` is redundant. Use a `<button>` instead:

```tsx
<SidebarMenuItem>
  <SidebarMenuButton
    isActive={pathname.startsWith("/news")}
    className="h-9 justify-start gap-2.5 rounded-xl border border-sidebar-border px-4 text-[13px] text-sidebar-foreground/70 transition-colors duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground data-[active=true]:bg-sidebar-accent/60 data-[active=true]:text-sidebar-foreground"
    tooltip="News"
    onClick={() => {
      setOpenMobile(false);
      const fromId = useChatStore.getState().activeConversationId;
      const from = fromId ? `/c/${fromId}` : "/";
      router.push(`/news?from=${encodeURIComponent(from)}`);
    }}
  >
    <NewspaperIcon className="size-4" />
    <span className="font-medium">News</span>
    <NewsBadge latestPublishedAt={latestNewsPublishedAt} />
  </SidebarMenuButton>
</SidebarMenuItem>
```

Add `import { useRouter } from "next/navigation";` if not already imported (it's not — add it).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

Expected: errors only about the call site of `AppSidebar` (in ChatApp) which still passes old props. That's fine — Task 7 fixes it.

- [ ] **Step 7: Commit**

```bash
git add components/sidebar/Sidebar.tsx
git commit -m "feat(sidebar): internalize callbacks, add News button with unread badge"
```

---

## Task 5: Create MainLayout client component

**Files:**
- Create: `components/MainLayout.tsx`

Client shell wrapping `SidebarProvider`, `AppSidebar`, and the content area.

- [ ] **Step 1: Create the component**

```tsx
// components/MainLayout.tsx
"use client";

import { AppSidebar } from "@/components/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
  latestNewsPublishedAt: string | null;
}

export function MainLayout({ children, latestNewsPublishedAt }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        <AppSidebar latestNewsPublishedAt={latestNewsPublishedAt} />
        {children}
      </div>
    </SidebarProvider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/MainLayout.tsx
git commit -m "feat: add MainLayout client shell for shared sidebar"
```

---

## Task 6: Create (main) route group layout and move chat routes

**Files:**
- Create: `app/(main)/layout.tsx`
- Create: `app/(main)/page.tsx` (content copied from `app/page.tsx`)
- Create: `app/(main)/c/[id]/page.tsx` (content copied from `app/c/[id]/page.tsx`)
- Delete: `app/page.tsx`
- Delete: `app/c/[id]/page.tsx`

- [ ] **Step 1: Create the (main) layout**

```tsx
// app/(main)/layout.tsx
import { getCachedPublicBlogPosts } from "@/lib/blog";
import { MainLayout } from "@/components/MainLayout";

export default async function MainGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const posts = await getCachedPublicBlogPosts();
  const latestNewsPublishedAt = posts[0]?.publishedAt?.toISOString() ?? posts[0]?.createdAt?.toISOString() ?? null;

  return (
    <MainLayout latestNewsPublishedAt={latestNewsPublishedAt}>
      {children}
    </MainLayout>
  );
}
```

- [ ] **Step 2: Create `app/(main)/page.tsx`**

```tsx
// app/(main)/page.tsx
import { ChatApp } from "@/components/chat/ChatApp";

export default function HomePage() {
  return <ChatApp />;
}
```

- [ ] **Step 3: Create `app/(main)/c/[id]/page.tsx`**

Copy the full content of `app/c/[id]/page.tsx` verbatim into `app/(main)/c/[id]/page.tsx` (same imports, same `generateMetadata`, same `ConversationPage` component).

- [ ] **Step 4: Delete the old root page and conversation page**

```bash
rm /srv/md0/robotics/curator/app/page.tsx
rm /srv/md0/robotics/curator/app/c/\[id\]/page.tsx
```

- [ ] **Step 5: Verify routes compile**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

Expected: TypeScript errors only from `ChatApp` still wrapping `SidebarProvider` (OK — next task fixes).

- [ ] **Step 6: Commit**

```bash
git add app/\(main\)/ && git rm app/page.tsx "app/c/[id]/page.tsx"
git commit -m "feat: create (main) route group with shared layout, move chat routes"
```

---

## Task 7: Refactor ChatApp — remove sidebar shell, read shareDialogConversationId from store

**Files:**
- Modify: `components/chat/ChatApp.tsx`

ChatApp loses `SidebarProvider`, `AppSidebar`, and the five handler functions. It reads `shareDialogConversationId` from the Zustand store.

- [ ] **Step 1: Remove unused imports**

Remove from `components/chat/ChatApp.tsx`:
- `import { SidebarProvider } from "@/components/ui/sidebar";`
- `import { AppSidebar } from "@/components/sidebar/Sidebar";`
- `import { updateConversation as updateConversationRequest } from "@/lib/conversation-api";` — check if still used (it is not, after removing rename/share handlers)
- Keep all others

- [ ] **Step 2: Add store import for shareDialogConversationId**

In the `useChatStore` destructure, add:

```ts
const {
  setActiveConversation,
  setDefaultChatMode,
  deleteConversation,       // remove — no longer needed here
  replaceConversations,
  upsertConversation,
  clearAllConversations,
  shareDialogConversationId,
  setShareDialogConversationId,
} = useChatStore();
```

Remove `deleteConversation` from the destructure if it was only used by `handleDeleteConversation`.

- [ ] **Step 3: Remove the five handler functions**

Delete entirely:
- `handleCreateConversation`
- `handleOpenConversation`
- `handleDeleteConversation`
- `handleRenameConversation`
- `handleShareConversation`
- `navigateToConversation` (if only used by those handlers — check: it's also used in the bootstrap effect for `transferredConversationId`)

Keep `navigateToConversation` — it IS still used in the bootstrap effect (`navigateToConversation(transferredConversationId, true)`).

Keep `handleShareChange` — still needed by ChatWindow.

Also remove local state that was only used by the removed handlers:
- `const [isShareUpdating, setIsShareUpdating] = useState(false);` — keep, still used by ChatWindow
- `const [shareDialogConversationId, setShareDialogConversationId] = useState<string | null>(null);` — REMOVE (now from store)

- [ ] **Step 4: Update the render — remove SidebarProvider + AppSidebar wrapper**

The current return for non-loading, non-not-found states:

```tsx
return (
  <>
    <OnboardingModal ... />
    <SidebarProvider defaultOpen={viewMode !== "public"}>
      <div className="flex h-svh w-full overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
        {viewMode !== "public" && (
          <AppSidebar
            onCreateConversation={handleCreateConversation}
            onOpenConversation={handleOpenConversation}
            onRenameConversation={handleRenameConversation}
            onShareConversation={handleShareConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        )}
        <ChatWindow ... />
      </div>
    </SidebarProvider>
  </>
);
```

Replace with:

```tsx
return (
  <>
    <OnboardingModal ... />
    <ChatWindow
      conversationOverride={viewMode === "public" ? publicConversation : null}
      readOnly={viewMode === "public"}
      canShare={viewMode === "owner" && isAuthenticated}
      onShareChange={handleShareChange}
      isShareUpdating={isShareUpdating}
      shareDialogConversationId={shareDialogConversationId}
      onShareDialogHandled={() => setShareDialogConversationId(null)}
    />
  </>
);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

Expected: clean compile (or pre-existing unrelated errors only).

- [ ] **Step 6: Quick smoke test**

```bash
cd /srv/md0/robotics/curator && npm run dev &
# Open http://localhost:3000 — chat loads with sidebar
# Open http://localhost:3000/c/<any-valid-id> — conversation loads
# Sidebar New Chat and Search still work
# Kill dev server after check
```

- [ ] **Step 7: Commit**

```bash
git add components/chat/ChatApp.tsx
git commit -m "refactor(ChatApp): remove sidebar shell and callbacks, read shareDialogConversationId from store"
```

---

## Task 8: Create news index page

**Files:**
- Create: `app/(main)/news/page.tsx`

Server component. Matches the dark chat UI design. Hero card for latest post, grid for older posts, empty state.

- [ ] **Step 1: Create the news index page**

```tsx
// app/(main)/news/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";
import { SidebarInset } from "@/components/ui/sidebar";
import { getCachedPublicBlogPosts } from "@/lib/blog";
import { buildPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "News",
  description: "Product updates, release notes, and operator notes from Curator.",
  path: "/news",
  keywords: ["Curator news", "Curator updates", "FRC AI updates"],
});

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function isNew(value?: Date | string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 7 * 24 * 60 * 60 * 1000;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const posts = await getCachedPublicBlogPosts();
  const [latest, ...older] = posts;
  const backHref = from ? decodeURIComponent(from) : "/";
  const backLabel = backHref.startsWith("/c/") ? "Back to chat" : "New chat";

  return (
    <SidebarInset className="overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10">

        {/* Top nav */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            ← {backLabel}
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] text-muted-foreground sm:text-[12px]">
            <NewspaperIcon className="size-3.5" />
            Curator News
          </div>
        </div>

        {/* Header */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Updates & release notes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            What's new in Curator
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground sm:text-[15px]">
            Product changes, operator notes, and FRC-season improvements.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-[1.6rem] border border-border/60 bg-card/64 px-6 py-14 text-center text-[14px] text-muted-foreground shadow-[var(--shadow-card)]">
            No updates published yet. Check back soon.
          </div>
        ) : (
          <>
            {/* Hero — latest post */}
            {latest && (
              <Link
                href={`/news/${latest.slug}?from=${encodeURIComponent(backHref)}`}
                className="group relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl transition-colors hover:border-white/10 hover:bg-card/85 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                  <NewspaperIcon className="size-3.5" />
                  Latest update
                  {isNew(latest.publishedAt ?? latest.createdAt) && (
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-400">
                      New
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {latest.title}
                </h2>
                <p className="mt-2.5 max-w-2xl text-[14px] leading-6 text-muted-foreground sm:text-[15px] sm:leading-7">
                  {latest.summary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                  {formatDate(latest.publishedAt ?? latest.createdAt) && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatDate(latest.publishedAt ?? latest.createdAt)}
                    </span>
                  )}
                  {latest.authorName && <span>By {latest.authorName}</span>}
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="size-3.5" />
                    {readingTime(latest.content)} min read
                  </span>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-foreground sm:text-sm">
                  Read update
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}

            {/* Older posts grid */}
            {older.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Previous updates
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    {posts.length} total
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {older.map((post) => (
                    <Link
                      key={post.id}
                      href={`/news/${post.slug}?from=${encodeURIComponent(backHref)}`}
                      className="group flex flex-col rounded-[1.5rem] border border-border/60 bg-card/64 p-5 shadow-[var(--shadow-card)] transition-colors hover:border-white/10 hover:bg-card/78"
                    >
                      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <NewspaperIcon className="size-3" />
                        Update
                        {isNew(post.publishedAt ?? post.createdAt) && (
                          <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-blue-400">
                            New
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-[17px] font-semibold leading-tight tracking-tight text-foreground">
                        {post.title}
                      </h3>
                      <p className="mt-2 flex-1 text-[13px] leading-5 text-muted-foreground">
                        {post.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground">
                        {formatDate(post.publishedAt ?? post.createdAt) && (
                          <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3" />
                          {readingTime(post.content)} min
                        </span>
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                        Read
                        <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </SidebarInset>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/news/page.tsx"
git commit -m "feat(news): add news index page with hero card and post grid"
```

---

## Task 9: Create news article page

**Files:**
- Create: `app/(main)/news/[slug]/page.tsx`

Server component. Article header, metadata, BlogMarkdown body, back nav.

- [ ] **Step 1: Create the article page**

```tsx
// app/(main)/news/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ClockIcon, NewspaperIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { SidebarInset } from "@/components/ui/sidebar";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { getCachedPublicBlogPost } from "@/lib/blog";
import { buildPublicPageMetadata } from "@/lib/seo";

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function readingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPublicBlogPost(slug);
  if (!post) {
    return buildPublicPageMetadata({
      title: "News",
      description: "Product updates and release notes from Curator.",
      path: "/news",
    });
  }
  return buildPublicPageMetadata({
    title: post.title,
    description: post.summary,
    path: `/news/${post.slug}` as `/news/${string}`,
  });
}

export default async function NewsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const post = await getCachedPublicBlogPost(slug);

  if (!post) notFound();

  const backHref = from ? decodeURIComponent(from) : "/";
  const backLabel = backHref.startsWith("/c/") ? "Back to chat" : "New chat";

  return (
    <SidebarInset className="overflow-y-auto">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_55%)]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">

        {/* Top nav */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/news?from=${encodeURIComponent(backHref)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            ← All news
          </Link>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground sm:text-[12px]"
          >
            {backLabel} →
          </Link>
        </div>

        {/* Article */}
        <article className="rounded-[1.75rem] border border-border/60 bg-card/72 p-6 shadow-[var(--shadow-float)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            <NewspaperIcon className="size-3.5" />
            Curator update
          </div>

          <h1 className="mt-4 text-[1.9rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-5 sm:text-4xl">
            {post.title}
          </h1>

          <p className="mt-3 text-[14px] leading-6 text-muted-foreground sm:mt-4 sm:text-[16px] sm:leading-7">
            {post.summary}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
            {formatDate(post.publishedAt ?? post.createdAt) && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
            )}
            {post.authorName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/[0.04] px-2.5 py-0.5 text-[11px]">
                {post.authorName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              {readingTime(post.content)} min read
            </span>
          </div>

          <div className="mt-6 border-t border-border/50 pt-6 sm:mt-8 sm:pt-8">
            <BlogMarkdown content={post.content} />
          </div>
        </article>

      </div>
    </SidebarInset>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add "app/(main)/news/[slug]/page.tsx"
git commit -m "feat(news): add article view page with back nav and reading time"
```

---

## Task 10: Update sitemap, add redirects, delete old blog files

**Files:**
- Modify: `next.config.ts`
- Modify: `app/sitemap.ts`
- Delete: `app/blog/page.tsx`
- Delete: `app/blog/[slug]/page.tsx`

- [ ] **Step 1: Add /blog → /news redirects in next.config.ts**

In `next.config.ts`, inside the `nextConfig` object, add an `async redirects()` function (after the existing `async headers()` function):

```ts
async redirects() {
  return [
    {
      source: "/blog",
      destination: "/news",
      permanent: true,
    },
    {
      source: "/blog/:slug",
      destination: "/news/:slug",
      permanent: true,
    },
  ];
},
```

- [ ] **Step 2: Update sitemap.ts**

In `app/sitemap.ts`, make these changes:

1. Change `getLastModifiedFor("app/blog/page.tsx")` to `getLastModifiedFor("app/(main)/news/page.tsx")`
2. Change the `/blog` sitemap entry URL to `/news`:
   ```ts
   url: `${SITE_URL}/news`,
   ```
3. Change each post URL from `/blog/${post.slug}` to `/news/${post.slug}`:
   ```ts
   url: `${SITE_URL}/news/${post.slug}`,
   ```

- [ ] **Step 3: Delete old blog files**

```bash
rm /srv/md0/robotics/curator/app/blog/page.tsx
rm "/srv/md0/robotics/curator/app/blog/[slug]/page.tsx"
rmdir /srv/md0/robotics/curator/app/blog 2>/dev/null || true
```

- [ ] **Step 4: Final TypeScript check**

```bash
cd /srv/md0/robotics/curator && npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

- [ ] **Step 5: Full end-to-end smoke test**

```bash
cd /srv/md0/robotics/curator && npm run build 2>&1 | tail -20
```

Expected: successful build, no route conflicts.

Manual checks after `npm run dev`:
- `/` — chat loads, sidebar visible with New Chat + Search + News buttons
- `/news` — news index loads inside the sidebar shell, back button present
- `/news/<slug>` — article loads, "← All news" and "← Back to chat/New chat" present
- `/blog` — redirects to `/news` (check in browser)
- News button in sidebar shows unread dot if there are recent posts
- Clicking News from a conversation: `?from=/c/<id>` is in the URL; article shows "Back to chat"
- Clicking News from empty chat: `?from=/` in URL; article shows "New chat"

- [ ] **Step 6: Commit**

```bash
git add next.config.ts app/sitemap.ts && git rm "app/blog/page.tsx" "app/blog/[slug]/page.tsx" 2>/dev/null || git add next.config.ts app/sitemap.ts
git commit -m "feat(news): add /blog redirects, update sitemap, remove old blog pages"
```
