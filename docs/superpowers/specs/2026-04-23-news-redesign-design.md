# News Section Redesign

**Date:** 2026-04-23  
**Status:** Approved

## Summary

Replace the standalone `/blog` pages with a "News" section that lives inside the main chat layout (sidebar persistent). Users navigate to it from a new sidebar item; articles open within the same shell. The old `/blog` routes are removed and redirected to `/news`.

## Route Structure

```
app/
  (main)/
    layout.tsx          ← shared shell: SidebarProvider + AppSidebar + children
    page.tsx            ← chat (moved from app/page.tsx)
    c/[id]/page.tsx     ← conversation (moved from app/c/[id]/page.tsx)
    news/
      page.tsx          ← news index (server component)
      [slug]/page.tsx   ← article view (server component)
  blog/                 ← deleted; next.config.ts adds /blog → /news redirects
```

`app/layout.tsx` keeps fonts, providers, and metadata only (no sidebar shell).

## Sidebar Changes

- New "News" `SidebarMenuButton` with `NewspaperIcon` icon
- Navigation: on click, passes `?from=<currentPath>` so article views know where to send the user back
  - If `activeConversationId` in store → `?from=/c/${activeConversationId}`
  - Else → `?from=/`
- Unread dot badge: separate `<NewsBadge>` client component
  - Receives `latestNewsPublishedAt: string | null` prop (fetched server-side in layout)
  - Compares with `lastSeenNewsAt` from localStorage
  - Shows a small filled dot on the News button when latest post is newer than last seen
  - Clears (sets `lastSeenNewsAt`) when user visits `/news`

## News Index (`/news`)

Matches existing dark-theme chat UI:
- `bg-[#0f0f0f]` with radial gradient glow header
- **Hero card** (latest post): large card, title, summary, date, author, "Read" CTA
- **Post grid**: uniform cards, 1-col mobile → 2-col md → 3-col xl
- Each card: title, summary, date, author, optional `NEW` badge (published < 7 days ago)
- Empty state card if no posts live yet
- SEO metadata via `buildPublicPageMetadata`

## Article View (`/news/[slug]`)

- Back button logic (reads `?from` param):
  - `from` contains `/c/` → "← Back to chat" → links to `from`
  - otherwise → "New chat" → links to `/`
- Secondary breadcrumb link: "← All news" → `/news`
- Article: title, summary, date, author pill, `BlogMarkdown` body (kept as-is)
- `notFound()` on missing slug
- SEO metadata per post

## Components

| Component | Location | Notes |
|-----------|----------|-------|
| `NewsBadge` | `components/news/NewsBadge.tsx` | Client, localStorage-based unread dot |
| `NewsIndex` | `app/(main)/news/page.tsx` | Server component, fetches posts |
| `NewsArticle` | `app/(main)/news/[slug]/page.tsx` | Server component |
| `BlogMarkdown` | keep as-is | No changes needed |

## Data / API

No new API routes. Layout server component calls `getCachedPublicBlogPosts()` to get `latestNewsPublishedAt`, passes to sidebar. Article pages call `getCachedPublicBlogPost(slug)`.

## Redirects

Add to `next.config.ts`:
```
/blog        → /news        (permanent)
/blog/:slug  → /news/:slug  (permanent)
```

## Labeling

All UI copy changes from "Blog" / "blog post" to "News" / "update". Route segment changes from `/blog` to `/news`. `lib/blog.ts` and cache tags are unchanged (internal only).
