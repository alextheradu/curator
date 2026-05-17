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
    <a href="LICENSE.md">License</a>
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

Curator is a Next.js 16 app built for FRC teams that need quick, grounded help during build season and competition season. It combines a focused chat interface, document-backed retrieval, live FRC data lookups, project memory, public chat sharing, support/reporting workflows, and an admin console for maintaining the knowledge base.

Curator is not affiliated with FIRST. Official manuals, rules, awards guidance, and event sources remain the authority.

## What It Does

- Answers FRC questions with a system prompt tuned for fair, verifiable team support.
- Searches indexed season and general documents with citations back to stored source files.
- Supports rookie and veteran chat modes, season selection, fact checking, and deeper search flows.
- Uses live web search for fresh or time-sensitive FRC context when enabled.
- Integrates with The Blue Alliance MCP path for event, match, ranking, and team context when configured.
- Persists conversations, projects, account settings, onboarding state, public shares, reports, and support requests.
- Gives admins tools for document uploads, document descriptions, reports, chats, users, blog posts, and operational stats.
- Ships as a PWA with metadata, Open Graph assets, sitemap, robots rules, and optional IndexNow submission.

## Stack

| Area | Technology |
| --- | --- |
| App | Next.js 16 App Router, React 19, TypeScript |
| UI | Tailwind CSS 4, Radix UI, Base UI, lucide-react, Framer Motion |
| Auth | Auth.js / NextAuth with Google OAuth |
| Database | PostgreSQL with Drizzle ORM and migrations |
| Retrieval | Qdrant vector search plus MinIO document storage |
| AI | OpenRouter chat, title, and document-description models |
| Search | Optional LangSearch web search and optional The Blue Alliance MCP |
| Observability | Sentry, app logs, client error endpoint |
| Tests | Vitest and React Testing Library-compatible component tests |

## Quick Start

Requirements:

- Node.js 20+
- npm
- Docker, if you want local Postgres and Qdrant from `docker-compose.yml`
- Google OAuth credentials
- OpenRouter API key

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

If you use the included Docker services, make sure `DATABASE_URL` points at the compose port:

```bash
DATABASE_URL=postgresql://curator:curatordevpw@localhost:5437/curator
POSTGRES_PASSWORD=curatordevpw
QDRANT_URL=http://localhost:6333
```

Start local infrastructure:

```bash
docker compose --env-file .env.local up -d postgres qdrant
```

Run migrations. Either export `DATABASE_URL` in your shell, or keep the same database settings in `.env.development.local` and use the dev helper:

```bash
npm run db:migrate:dev
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

The full list lives in [.env.example](.env.example). The most important groups are:

| Group | Variables |
| --- | --- |
| Core | `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, `AUTH_SECRET`, `DATABASE_URL` |
| Auth | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS` |
| AI | `OPENROUTER_API_KEY`, `OPENROUTER_CHAT_MODELS`, `OPENROUTER_DESCRIPTION_MODELS`, `OPENROUTER_TITLE_MODEL` |
| Retrieval | `QDRANT_URL`, `QDRANT_COLLECTION`, `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` |
| Optional search | `LANGSEARCH_API_KEY`, `TBA_MCP_ENABLED`, `TBA_API_KEY` |
| Analytics | `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` |
| Sentry | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` |
| Indexing | `INDEXNOW_KEY`, `INDEXNOW_SITE_URL`, `INDEXNOW_SUBMIT_ON_START`, `INDEXNOW_SUBMIT_DELAY_MS` |

Generate an auth secret with:

```bash
openssl rand -base64 32
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server on the default port. |
| `npm run dev:local` | Start the dev server on port 3001. |
| `npm run build` | Clean `.next`, build with `.env`, then restart the PM2 `curator` process. |
| `npm start` | Run the production server through `scripts/start-next.js`. |
| `npm run lint` | Run ESLint. |
| `npm test` | Run the Vitest suite. |
| `npm run db:generate` | Generate Drizzle migrations. |
| `npm run db:migrate` | Run Drizzle migrations with the current shell environment. |
| `npm run db:migrate:dev` | Run Drizzle migrations through `.env.development.local`. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run indexnow:submit` | Submit key site URLs to IndexNow. |
| `npm run site:check-assets` | Check public site assets against a target URL. |
| `npm run eval:chat` | Run chat evaluation cases. |

## Production Notes

Build and run:

```bash
npm run build
npm start
```

`npm start` uses `scripts/start-next.js` so PM2 and similar process managers can pass ports consistently. The same startup script can optionally submit IndexNow URLs once per process start:

```bash
INDEXNOW_SUBMIT_ON_START=true
INDEXNOW_SUBMIT_DELAY_MS=5000
```

Curator exposes production search and sharing surfaces through:

- `robots.txt` from `app/robots.ts`
- `sitemap.xml` from `app/sitemap.ts`
- Open Graph and PWA assets in `app/` and `public/`
- an IndexNow key route at `/indexnow-key.txt`

Admin routes, admin APIs, and shared chat internals are marked `noindex` and also emit `X-Robots-Tag` headers where appropriate.

## Observability and Consent

Google Analytics only loads after the visitor accepts analytics cookies from the consent banner:

```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

Sentry is supported for browser and server errors, tracing, logs, and Session Replay:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

When `NEXT_PUBLIC_SENTRY_DSN` is configured, browser events are sent through the app's `/_events` tunnel route. Source map upload is opt-in and only runs when release management is enabled and the Sentry build credentials are present:

```bash
SENTRY_RELEASE_MANAGEMENT_ENABLED=true
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

## Project Map

```text
app/                         Next.js routes, API routes, metadata, PWA assets
components/                  Chat, admin, auth, sidebar, analytics, and UI components
lib/                         AI, retrieval, database, caching, rate limiting, site utilities
lib/db/schema.ts             Drizzle schema for app data and Auth.js tables
public/                      Legal docs, icons, logo, manifest assets
scripts/                     Runtime helpers, indexing, evals, asset checks
tests/                       Vitest coverage for chat, projects, sidebar, and settings flows
docs/superpowers/            Design specs and implementation plans
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
npm run build
```

For analytics, Sentry, SEO, or PWA work, also verify the relevant browser behavior and run:

```bash
npm run site:check-assets
```
