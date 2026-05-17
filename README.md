<div align="center">
  <a href="https://curatorfrc.com">
    <img src="public/logo-full.png" alt="Curator" width="620" />
  </a>

  <p>
    A season-aware AI workspace for FIRST Robotics Competition teams.
  </p>

  <p>
    <a href="https://curatorfrc.com">Live app</a>
    |
    <a href="https://github.com/alextheradu/curator">Repository</a>
    |
    <a href="public/privacy-policy.md">Privacy Policy</a>
    |
    <a href="public/terms-of-service.md">Terms</a>
    |
    <a href="LICENSE">License</a>
  </p>

  <p>
    <img src="https://hackatime-badge.hackclub.com/U0AFWJX9CP2/curator" alt="Hackatime project activity" />
  </p>

  <p>
    <img src="https://img.shields.io/github/last-commit/alextheradu/curator?style=for-the-badge&logo=github&color=0066B3" alt="Last commit" />
    <img src="https://img.shields.io/github/stars/alextheradu/curator?style=for-the-badge&logo=github&color=ED1C24" alt="GitHub stars" />
    <img src="https://img.shields.io/badge/Next.js-16.2.3-000000?style=for-the-badge&logo=nextdotjs" alt="Next.js 16.2.3" />
    <img src="https://img.shields.io/badge/React-19.2.4-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React 19.2.4" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Postgres-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Postgres 16" />
    <img src="https://img.shields.io/badge/Qdrant-vector_search-DC244C?style=for-the-badge" alt="Qdrant vector search" />
  </p>
</div>

## Overview

Curator is a Next.js 16 app for FRC teams that need grounded answers, source-backed rules help, live event context, and structured team memory in one workspace. It combines a chat interface, retrieval over indexed season documents, optional live web and The Blue Alliance lookups, project organization, public chat sharing, support/reporting tools, a public news feed, and an admin console for operations and content management.

Curator is not affiliated with FIRST. Official manuals, Q&A, awards guidance, event data, and field documentation remain the authority.

## What It Does

- Answers FRC questions with season-aware prompts tuned for rookie and veteran audiences.
- Supports `fast`, `balanced`, and `deep` search modes for different retrieval depth and latency tradeoffs.
- Pulls citations from indexed PDFs, optional live web search, and optional The Blue Alliance tool calls.
- Stores season-scoped and general document chunks in Qdrant and serves source files from MinIO-compatible storage.
- Organizes chats into projects with context summaries and project-level memory.
- Supports guest chats in browser storage, then transfers them into the account after sign-in.
- Lets users publish chats with shareable public links and browse public chat views safely.
- Includes onboarding, default chat/search preferences, theme controls, cookie preferences, data export, and support forms.
- Captures answer-quality feedback, message reports, support requests, and moderation signals.
- Publishes a `/news` feed backed by admin-managed blog posts.
- Ships an admin workspace for stats, documents, news posts, users, chats, reports, feedback, and operational triage.
- Runs as a PWA and includes a Capacitor iOS shell with native Google sign-in support, offline handling, and keyboard/runtime fixes.

## Stack

| Area | Technology |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Base UI, lucide-react, Framer Motion |
| Auth | Auth.js / NextAuth with Google OAuth, Apple Sign In, and native iOS Google token sign-in |
| State | Zustand persisted client state for chat UI preferences and guest conversations |
| Database | PostgreSQL with Drizzle ORM and SQL migrations |
| Retrieval | Qdrant vector search plus MinIO-compatible object storage |
| AI | OpenRouter chat, title, and document-description models |
| Search | Indexed FRC docs, optional LangSearch web search, optional The Blue Alliance MCP bridge |
| Observability | Sentry, app logs, client error ingestion, rate limiting |
| Delivery | PWA assets, service worker, metadata, Open Graph, sitemap, robots, IndexNow, Capacitor iOS |
| Tests | Vitest |

## Quick Start

Requirements:

- Node.js 20+
- npm
- PostgreSQL
- Qdrant
- Google OAuth credentials
- OpenRouter API key

Optional but commonly used:

- Docker for local Postgres and Qdrant from `docker-compose.yml`
- MinIO or another S3-compatible object store for document uploads and source-file viewing
- LangSearch API key for live web search
- The Blue Alliance API key for TBA-backed live lookups

Install dependencies:

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env.local
cp .env.example .env.development.local
```

If you plan to use `npm run build`, `npm run build:ci`, or `npm start`, also create `.env` because those scripts load that file explicitly:

```bash
cp .env.example .env
```

If you use the included Docker services, make sure your DB settings match the compose port:

```bash
DATABASE_URL=postgresql://curator:curatordevpw@localhost:5437/curator
POSTGRES_PASSWORD=curatordevpw
QDRANT_URL=http://localhost:6333
```

Start local infrastructure:

```bash
docker compose --env-file .env.local up -d postgres qdrant
```

The compose file does not start MinIO. Point the MinIO vars at an existing bucket or run your own S3-compatible store separately if you want document upload and document viewing to work end to end.

Run migrations:

```bash
npm run db:migrate:dev
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

The baseline template lives in [.env.example](.env.example). The app currently references the following groups of variables:

| Group | Variables |
| --- | --- |
| Core | `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, `AUTH_SECRET`, `DATABASE_URL`, `PORT` |
| Web auth | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_AUTH_GOOGLE_ID`, `ADMIN_EMAILS` |
| Native and Apple auth | `AUTH_GOOGLE_IOS_CLIENT_ID`, `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`, `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` |
| AI | `OPENROUTER_API_KEY`, `OPENROUTER_CHAT_MODELS`, `OPENROUTER_DESCRIPTION_MODELS`, `OPENROUTER_TITLE_MODEL` |
| Retrieval | `QDRANT_URL`, `QDRANT_COLLECTION`, `MINIO_ENDPOINT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |
| Optional live search | `LANGSEARCH_API_KEY`, `TBA_MCP_ENABLED`, `TBA_API_KEY` |
| Site and analytics | `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_APP_BUILD_ID` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE`, `SENTRY_RELEASE_MANAGEMENT_ENABLED`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| Indexing | `INDEXNOW_KEY`, `INDEXNOW_SITE_URL`, `INDEXNOW_SUBMIT_ON_START`, `INDEXNOW_SUBMIT_DELAY_MS` |
| Runtime helpers | `PM2_PROCESS_NAME`, `EVAL_BASE_URL` |

Generate an auth secret with:

```bash
openssl rand -base64 32
```

For Apple Sign In, generate the client secret separately if you configure that provider:

```bash
node scripts/generate-apple-secret.mjs
```

## User Flows

### Chat workspace

- Empty-state prompt suggestions, season selection, streaming responses, markdown/code rendering, and citations.
- Search modes:
  - `fast`: answer from current context and a smaller document pass.
  - `balanced`: short document, web, and live-tool loop.
  - `deep`: broader tool loop with larger document searches and more web coverage.
- Optional fact-check pass for answers that should be re-verified against retrieved document context.
- Guest usage is stored locally and currently limited to `3` message sends before sign-in is required.

### Accounts and settings

- Google sign-in on web.
- Apple sign-in on web when Apple credentials are configured.
- Native Google sign-in for Capacitor iOS using an ID-token credentials flow.
- Onboarding captures preferred name, team number, chat mode, and search mode.
- Settings support theme selection, default chat mode, default search mode, cookie preferences, account export, and reset controls.

### Collaboration and support

- Projects group chats and maintain a reusable project context summary.
- Public conversation sharing exposes read-only share links for opted-in chats.
- Users can report assistant messages, submit quality feedback, and send support requests from the support form.
- Account export includes user profile data, settings, projects, conversations with messages, support requests, and reports.

### Content and admin

- `/news` renders published blog posts managed from the admin panel.
- Admin routes cover stats, news, documents, users, chats, reports, feedback, and ops.
- Document uploads can be stored in object storage, chunked, embedded, and indexed into Qdrant.
- Admin stats compare database chunk counts with Qdrant vector counts and surface moderation and auth health.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server on the default port. |
| `npm run dev:local` | Start the dev server on port `3001`. |
| `npm run build:next` | Remove `.next` and build using values loaded from `.env`. |
| `npm run build` | Run the production build, then restart the PM2 process. |
| `npm run build:ci` | Build without the PM2 restart step. |
| `npm start` | Start the production server through `scripts/start-next.js` using `.env`. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Vitest suite. |
| `npm run eval:chat` | Run chat evaluation cases against the configured base URL. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Run Drizzle migrations with the current shell environment. |
| `npm run db:migrate:dev` | Run Drizzle migrations using `.env.development.local`. |
| `npm run db:studio` | Open Drizzle Studio with the current shell environment. |
| `npm run db:studio:dev` | Open Drizzle Studio using `.env.development.local`. |
| `npm run site:check-assets` | Check public SEO and asset endpoints against a target URL. |
| `npm run indexnow:submit` | Submit key site URLs to IndexNow. |
| `npm run cap:assets` | Generate Capacitor iOS app icons from `resources`. |
| `npm run cap:sync` | Sync web assets and plugins into the Capacitor project. |
| `npm run cap:open:ios` | Open the iOS workspace in Xcode. |

## Production Notes

Build and run:

```bash
npm run build
npm start
```

`npm run build` assumes a PM2-managed process and calls `scripts/restart-curator.mjs`. Set `PM2_PROCESS_NAME` if the deployed process is not named `curator`.

`npm start` uses `scripts/start-next.js` so process managers can pass ports consistently. The same startup path can also submit IndexNow once per process start:

```bash
INDEXNOW_SUBMIT_ON_START=true
INDEXNOW_SUBMIT_DELAY_MS=5000
```

Curator exposes public discovery surfaces through:

- `robots.txt` from `app/robots.ts`
- `sitemap.xml` from `app/sitemap.ts`
- Open Graph and app metadata in `app/` and `public/`
- `llms.txt` in `public/llms.txt`
- an IndexNow key route at `/indexnow-key.txt`

Admin routes and admin APIs are marked `noindex`, and shared/private conversation boundaries are enforced in route handlers before content is returned.

## Observability, Consent, and PWA Behavior

Google Analytics stays off until the visitor accepts analytics cookies:

```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Sentry supports browser and server errors, tracing, logs, and replay sampling:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE=0
NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1
```

When `NEXT_PUBLIC_SENTRY_DSN` is configured, browser events are tunneled through `/_events`. Source map upload only runs when release management is enabled and Sentry build credentials are present:

```bash
SENTRY_RELEASE_MANAGEMENT_ENABLED=true
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

The app also:

- registers a service worker outside local dev
- serves an offline screen at `/offline`
- attempts asset recovery when stale Next.js chunks fail to load
- shows a slow-connection banner and a native Capacitor offline shell when appropriate

## Project Map

```text
app/                         App Router pages, route handlers, metadata, PWA entrypoints
app/(main)/                  Main chat and public news routes
app/admin/                   Admin workspace routes
app/api/                     Chat, account, admin, support, feedback, and document APIs
components/analytics/        Consent banner and Google Analytics loader
components/auth/             Auth, onboarding, and ToS modals
components/chat/             Chat app, window, input, markdown, search activity, citations
components/admin/            Admin panels for docs, chats, reports, users, blog, and ops
components/pwa/              Service-worker runtime and offline UX helpers
components/sidebar/          Main workspace sidebar, projects, history, and dialogs
lib/                         AI, retrieval, auth helpers, DB access, logging, rate limiting, SEO
lib/db/                      Drizzle schema and SQL migrations
public/                      Legal docs, PWA assets, logos, icons, and `llms.txt`
scripts/                     Build/runtime helpers, evals, asset checks, IndexNow, Apple secret
tests/                       Vitest coverage
docs/superpowers/            Internal design specs and implementation plans
```

## Legal Document Rule

The live legal documents are:

- [public/privacy-policy.md](public/privacy-policy.md)
- [public/terms-of-service.md](public/terms-of-service.md)

Keep them in sync with product changes. If a feature changes data collection, storage, third-party services, cookies, data retention, authentication, user rights, or acceptable use, update the relevant sections and bump the "Last updated" date in the same change.

## Verification

Before shipping a change, run the checks that match the touched surface:

```bash
npm run lint
npm test
npm run build:ci
```

For analytics, Sentry, SEO, PWA, or static-asset work, also run:

```bash
npm run site:check-assets
```
