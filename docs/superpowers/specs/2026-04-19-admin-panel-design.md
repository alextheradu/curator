# Admin Panel Redesign — Design Spec
_Last updated: 2026-04-19_

## Overview

Replace the single `/admin/documents` page with a full admin panel: shared layout shell, stats dashboard, structured document upload, user management, chat viewer, and a reports system. All destructive or sensitive actions use confirmation popups.

---

## 1. Admin Hierarchy

Two tiers of admin:

| Tier | Source | Can be revoked from UI |
|------|--------|------------------------|
| Superadmin | `ADMIN_EMAILS` env var | No — locked |
| Admin | `users.isAdmin` DB column | Yes — by superadmins only |

`auth.ts` updated: `isAdmin` = env-var match OR `users.isAdmin = true`. Superadmin emails always win regardless of DB flag.

Middleware enforces IP bans on all routes (full block). API routes also check the ban list independently as a second layer.

---

## 2. Database Schema Changes

### `users` table — new columns
- `isAdmin: boolean` — default false
- `ipBanned: boolean` — default false
- `bannedIp: text` — IP address that triggered the ban

### New `bannedIps` table
| Column | Type | Notes |
|--------|------|-------|
| `ip` | text | primary key |
| `reason` | text | |
| `bannedAt` | timestamp | defaultNow |
| `bannedById` | text | references users.id |

### New `reports` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | primary key |
| `conversationId` | uuid | references conversations.id |
| `messageId` | uuid | references messages.id |
| `reportedById` | text | references users.id |
| `reason` | text | |
| `status` | enum | `pending` \| `reviewed` \| `dismissed` |
| `createdAt` | timestamp | defaultNow |

### `documents` table — new column
- `tags: text[]` — optional free-form tags

---

## 3. Admin Shell Layout

**File:** `app/admin/layout.tsx`

- Server component — checks auth, redirects non-admins to `/`
- Renders persistent left sidebar with links to all admin sections
- Sidebar shows current user avatar + badge: "Superadmin" (gold) or "Admin" (blue)
- Mobile: sidebar collapses to a top navigation strip

### Sidebar nav items
1. Stats — `/admin`
2. Documents — `/admin/documents`
3. Users — `/admin/users`
4. Chats — `/admin/chats`
5. Reports — `/admin/reports` (shows pending count badge)

The existing `/admin/documents` page content is preserved inside this new shell.

---

## 4. Stats Dashboard (`/admin`)

Two sections displayed as stat cards + tables.

### Usage stats (from DB)
- Total users
- New users: last 7 days / last 30 days
- Total conversations
- Conversations active today
- Total messages
- Messages last 7 days
- Top 5 most active users (by message count)
- Pending reports count (shown as alert if > 0)

### Content stats (from DB + Qdrant)
- Documents indexed
- Total pages across all documents
- Total doc chunks
- Season documents vs general documents breakdown
- Qdrant vector count (via Qdrant collection info API)

No charting library — stat cards and simple tables only.

---

## 5. User Management (`/admin/users`)

### Table columns
Avatar · Name · Email · Joined date · Message count · Admin status · Banned status

### Filters
- Search by name or email
- Filter: All / Admins / Banned

### Per-row actions (all open confirmation popups)
| Action | Condition | Effect |
|--------|-----------|--------|
| Elevate to admin | Non-admin, non-superadmin | Sets `users.isAdmin = true` |
| Revoke admin | DB admin only (not superadmin) | Sets `users.isAdmin = false` |
| View chats | Any | Links to `/admin/chats?userId=xxx` |
| Delete user | Any non-superadmin | Cascade deletes via FK |
| IP ban | Unbanned user | Writes to `bannedIps` + sets `users.ipBanned = true` |
| Unban | Banned user | Removes from `bannedIps`, clears `users.ipBanned` |

Superadmin rows show a lock icon — elevate/revoke/delete actions are disabled.

---

## 6. Chat Viewer (`/admin/chats`)

### Table columns
User · Conversation title · Season · Message count · Created date · Reports flag

### Filters
- `?userId=xxx` — pre-filters to one user (linked from user management)
- Season filter
- Date range filter

### Conversation detail
Click any row → **modal popup** (not a new page) showing:
- Full message thread, read-only, same visual style as chat UI
- Reports badge if conversation has pending reports
- Close button only — no editing

Table rows with pending reports show a colored indicator.

---

## 7. AI-Generated Chat Titles

When a new conversation gets its first assistant response:
1. Fire a background request to LLM with the first user message + assistant response
2. LLM returns a short title (4–6 words)
3. Title streams character-by-character into the sidebar and chat header
4. Typing cursor animation plays during stream, disappears on complete
5. Title persists to `conversations.title` in DB

"New Chat" is the fallback if generation fails.

---

## 8. Reports (`/admin/reports`)

### Table columns
Reporter · Conversation title · Flagged at · Reason · Status (pending/reviewed/dismissed)

### Report detail popup
Click any row → modal showing:
- Flagged message with 3 messages above for context (read-only)
- Actions:
  - **Dismiss** — sets status = `dismissed`
  - **View full chat** — opens chat viewer modal
  - **Delete message** — removes message, sets status = `reviewed`
  - **Ban user** — opens IP ban confirmation popup, sets status = `reviewed`

### User-facing report button
- Small flag icon on each assistant message in the chat UI
- Click → popup with reason text field (required) + submit
- Calls `POST /api/reports`
- One report per user per message (duplicate blocked server-side)

---

## 9. Document Upload (Structured)

Upload triggered via a button that opens a **3-step modal**.

### Step 1 — File
- Drag-and-drop or file picker
- PDF only, validated client + server side
- Shows filename and page count preview after selection

### Step 2 — Metadata
| Field | Type | Notes |
|-------|------|-------|
| Name | text | Auto-filled from filename, editable |
| Scope | toggle | Season / General |
| Season year | number | Only shown when scope = season |
| Description | textarea | Optional; "Generate with AI" button available |
| Tags | tag input | Optional free-form |

### Step 3 — Confirm
- Summary card: name, scope, season, description, estimated chunk count
- "Upload & Index" button starts the process
- Progress bar during upload + indexing
- On complete: modal dismisses, document list refreshes

---

## 10. User-Facing Sidebar Resize

The regular user sidebar (not admin) gets a drag handle on its right edge:
- User can drag to make it narrower or wider
- Min width: 48px (icon-only mode), Max width: 320px
- Width persists to `localStorage`

Admin sidebar is fixed width — no resize handle.

---

## 11. API Endpoints Added

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/stats` | Usage + content stats |
| GET | `/api/admin/users` | Paginated user list |
| PATCH | `/api/admin/users/[id]` | Toggle admin, ban/unban |
| DELETE | `/api/admin/users/[id]` | Delete user |
| GET | `/api/admin/chats` | All conversations (paginated) |
| GET | `/api/admin/chats/[id]` | Full message thread |
| GET | `/api/admin/reports` | Reports list |
| PATCH | `/api/admin/reports/[id]` | Update report status |
| POST | `/api/reports` | User submits a report |
| POST | `/api/conversations/[id]/title` | Trigger AI title generation |

---

## 12. Middleware Updates

`middleware.ts` updated to:
1. Check `bannedIps` table on every request
2. Return 403 for banned IPs before any route handling
3. Protect all `/admin/*` routes — redirect non-admins to `/`
