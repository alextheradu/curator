# Curator — Full Redesign Design Spec

**Date:** 2026-04-14  
**Status:** Approved  
**Replaces:** `docs/superpowers/plans/2026-04-13-curator-frc-ai-chatroom.md`

---

## Goal

Rebuild Curator into a production-grade FRC AI assistant modeled on ChatGPT/Claude.ai — dark gray UI with FIRST colors, Google authentication with a guest-then-prompt flow, RAG over uploaded FRC PDFs (game manuals, team updates), LangSearch-powered web search, and a full citation system linking responses back to source documents.

---

## 1. Architecture

**Approach:** Monolithic Next.js 16 App Router — one deployment, one repo.

**Stack:**
- Next.js 16 App Router · TypeScript · Tailwind v4 · shadcn/ui
- Auth.js v5 — Google OAuth, JWT session strategy
- PostgreSQL 16 (port `5433`) — users, conversations, messages, document metadata
- Qdrant (port `6333`) — vector embeddings for PDF chunks
- OpenRouter (Gemma 3 27B via `google/gemma-3-27b-it:free`) — LLM, streaming SSE, tool calling
- LangSearch API — web search tool
- MinIO (self-hosted, existing instance) — PDF blob storage
- Drizzle ORM — schema + type-safe queries + migrations

**Request flow:**
1. User sends message → `POST /api/chat`
2. Route checks auth session; if guest and `guest_message_count >= 1`, return `401` with `{ code: "auth_required" }`
3. Embed query via OpenRouter embeddings → query Qdrant top-5 chunks
4. Build system prompt with injected `[SOURCE N]` chunks
5. Send to OpenRouter with `search_web` tool definition
6. If model calls `search_web` → hit LangSearch → inject results as tool response message
7. Stream final response back to client
8. On stream end → save message + parsed citations to Postgres

---

## 2. Auth & Guest Flow

**Guest behavior:**
- First visit → **TOS/Privacy Policy acceptance modal** must be dismissed before any input is enabled. Sets `tos_accepted=true` cookie.
- First message → sent as guest. Sets `guest_message_count=1` cookie.
- Second message attempt → **auth modal**: "Create a free account to keep chatting" + Google sign-in button. Blocks send.
- After login → guest conversation (from `localStorage`) migrated to Postgres under the new user. Nothing lost.

**Auth.js v5:**
- Provider: Google OAuth only
- Session: JWT strategy (no DB sessions table)
- `auth()` called in `/api/chat` route handler
- Guest cookie `guest_message_count` checked server-side for unauthenticated requests

**Admin access:**
- Route `/admin/documents` protected by `ADMIN_EMAILS` env var (comma-separated)
- Checked in middleware: `session.user.email` must be in the allowlist

**Legal pages:**
- `/terms-of-service` and `/privacy-policy` — rendered from `public/terms-of-service.md` and `public/privacy-policy.md`
- Linked from the TOS acceptance modal
- **Must be kept in sync** with any feature changes that affect data handling (see AGENTS.md)

---

## 3. UI & Visual Design

**Color tokens** (CSS custom properties in `app/globals.css`):
```css
--bg-base:       #0f0f0f;   /* near-black, main chat area */
--bg-surface:    #1a1a1a;   /* sidebar, cards */
--bg-elevated:   #242424;   /* input bar, modals */
--accent-red:    #ED1C24;   /* FIRST Red — primary CTA, active states */
--accent-blue:   #0066B3;   /* FIRST Blue — links, secondary actions */
--accent-white:  #FFFFFF;
--text-primary:  #F5F5F5;
--text-muted:    #8A8A8A;
--border:        #2e2e2e;
```

**Layout:**
- Left sidebar: `260px` fixed, collapsible to icon rail, `--bg-surface`
  - FIRST Red logo mark + "Curator" wordmark at top
  - "New Chat" button (red, full width)
  - Conversation list (scrollable)
  - Settings gear + user avatar at bottom
- Main chat area: `--bg-base`, messages in `max-w-3xl` centered column
- Input bar: pinned bottom, `--bg-elevated`, pill shape, red send button
- No light mode — dark only

**Key UI components (via shadcn MCP):**
- `Button`, `Input`, `Textarea`, `Dialog`, `Sheet` (mobile sidebar), `ScrollArea`, `Badge`, `Tooltip`, `Skeleton`, `Separator`

**Graphics:**
| Asset | Format | Generation method |
|-------|--------|------------------|
| App logo SVG | SVG | Hand-crafted (gear + wordmark) |
| Favicon | ICO + SVG | Derived from logo |
| Apple touch icon 180×180 | PNG | Derived from logo |
| OG embed image 1200×630 | Dynamic | `app/opengraph-image.tsx` via `ImageResponse` |
| Twitter card | Dynamic | Shared `ImageResponse` |
| PWA manifest icons 192px, 512px | PNG | Derived from logo |

OG image: dark `#0f0f0f` background, FIRST Red Curator logo centered, tagline "FRC's AI Knowledge Base" in white, subtle red grid pattern.

---

## 4. RAG Pipeline & Document Indexing

**Admin upload flow (`/admin/documents`):**
1. Upload PDF → POST to `/api/admin/documents/upload`
2. File stored in MinIO bucket `curator-docs` under key `{season_year}/{filename}`
3. `pdf-parse` extracts text page by page
4. Text split into ~500-token chunks, 50-token overlap
5. Each chunk embedded via OpenRouter embeddings endpoint
6. Embeddings stored as Qdrant points in collection `frc_docs`, payload includes `{ doc_id, doc_name, season_year, page_number, chunk_index, minio_key }`
7. Document metadata saved to Postgres `documents` table

**Query-time RAG:**
1. User message embedded → Qdrant `search` top-5 by cosine similarity
2. Each result: `doc_name`, `page_number`, `minio_key`, `chunk_text`
3. Chunks injected into system prompt as numbered `[SOURCE 1]` … `[SOURCE 5]` blocks
4. AI instructed to cite inline as `[1]`, `[2]` etc.
5. Streamed response parsed for citation markers → rendered as `CitationBadge` chips
6. Each badge links to the PDF in MinIO (presigned URL, 1hr expiry) with `#page=N` fragment

**Database schema additions:**
```sql
documents (id, name, season_year, minio_key, page_count, uploaded_at, uploaded_by_id)
doc_chunks (id, document_id, chunk_index, page_number, content, qdrant_point_id)
```

---

## 5. Web Search (LangSearch)

**Trigger:** Model-driven via OpenRouter tool calling. The `search_web` tool is always available; model decides when to use it.

**Flow:**
1. OpenRouter request includes `tools: [{ name: "search_web", description: "...", parameters: { query: string } }]`
2. If model returns `tool_calls` → parse query → POST to LangSearch API (`lib/langsearch.ts`)
3. Top-3 results (title, snippet, URL) injected as a `tool` role message
4. OpenRouter continues streaming the final response
5. Web citations rendered as `CitationBadge` with globe icon + source domain, linking to URL

**Config:** `LANGSEARCH_API_KEY` in `.env.local`. Helper in `lib/langsearch.ts`.

---

## 6. Infrastructure

**Docker Compose** (`docker-compose.yml` at repo root):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: curator
      POSTGRES_USER: curator
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes: [curator_pg_data:/var/lib/postgresql/data]

  qdrant:
    image: qdrant/qdrant:latest
    ports: ["6333:6333", "6334:6334"]
    volumes: [curator_qdrant_data:/qdrant/storage]

volumes:
  curator_pg_data:
  curator_qdrant_data:
```

**Environment variables (`.env.local`):**
```bash
# Auth
AUTH_SECRET=                    # generate with: openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database
DATABASE_URL=postgresql://curator:PASSWORD@localhost:5433/curator

# MinIO
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=curator-docs

# AI
OPENROUTER_API_KEY=

# Search
LANGSEARCH_API_KEY=

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ADMIN_EMAILS=                   # comma-separated admin email addresses
POSTGRES_PASSWORD=              # matches docker-compose
```

**ORM:** Drizzle — schema at `lib/db/schema.ts`, migrations at `lib/db/migrations/`, scripts:
- `npm run db:generate` — generate migration
- `npm run db:migrate` — apply migrations
- `npm run db:studio` — Drizzle Studio UI

---

## 7. File Map

| File / Directory | Responsibility |
|-----------------|---------------|
| `app/layout.tsx` | Root layout, providers, metadata |
| `app/page.tsx` | Main chat page |
| `app/globals.css` | Color tokens, Tailwind base |
| `app/opengraph-image.tsx` | Dynamic OG + Twitter card image |
| `app/terms-of-service/page.tsx` | Renders ToS markdown |
| `app/privacy-policy/page.tsx` | Renders Privacy Policy markdown |
| `app/admin/documents/page.tsx` | PDF upload UI (admin only) |
| `app/api/chat/route.ts` | Streaming chat handler (RAG + tool calling) |
| `app/api/admin/documents/upload/route.ts` | PDF ingest handler |
| `app/api/admin/documents/route.ts` | List/delete documents |
| `auth.ts` | Auth.js v5 config (Google provider) |
| `middleware.ts` | Auth middleware + admin route protection |
| `docker-compose.yml` | Postgres + Qdrant services |
| `lib/db/schema.ts` | Drizzle schema (users, conversations, messages, documents, doc_chunks) |
| `lib/db/index.ts` | Drizzle client |
| `lib/db/migrations/` | SQL migration files |
| `lib/langsearch.ts` | LangSearch API helper |
| `lib/minio.ts` | MinIO client + upload/presign helpers |
| `lib/qdrant.ts` | Qdrant client + search/upsert helpers |
| `lib/embeddings.ts` | OpenRouter embeddings helper |
| `lib/chunker.ts` | PDF text extraction + chunking |
| `lib/rag.ts` | Orchestrates embed → search → context building |
| `lib/frc-system-prompt.ts` | System prompt with RAG injection slots |
| `lib/store.ts` | Zustand store (guest state, UI state) |
| `lib/utils.ts` | cn(), citation parser, token estimator |
| `components/auth/TosModal.tsx` | TOS acceptance gate modal |
| `components/auth/AuthModal.tsx` | "Sign in to continue" modal |
| `components/sidebar/Sidebar.tsx` | Collapsible sidebar |
| `components/sidebar/ConversationItem.tsx` | Single history item |
| `components/chat/ChatWindow.tsx` | Message list + auto-scroll |
| `components/chat/MessageBubble.tsx` | User/AI bubble, markdown, citations |
| `components/chat/InputBar.tsx` | Auto-expanding textarea, send |
| `components/chat/StreamingIndicator.tsx` | Animated typing indicator |
| `components/chat/EmptyState.tsx` | Logo + starter prompts |
| `components/ui/CitationBadge.tsx` | Doc + web citation chip |
| `components/ui/SettingsModal.tsx` | Settings (temp slider, account) |
| `components/admin/DocumentUploader.tsx` | Drag-and-drop PDF upload |
| `components/admin/DocumentList.tsx` | List of indexed documents |
| `public/logo.svg` | App logo SVG |
| `public/terms-of-service.md` | Terms of Service |
| `public/privacy-policy.md` | Privacy Policy |
| `hooks/useAutoScroll.ts` | Auto-scroll with user-pause |
| `hooks/useGuestLimit.ts` | Guest message count cookie logic |
