Curator is a Next.js 16 app for FIRST Robotics Competition teams. It combines chat, document-backed retrieval, live FRC data lookups, and an admin surface for managing indexed documents and reports.

## Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Production

Build and run:

```bash
npm run build
npm start
```

`npm start` uses `scripts/start-next.js` so it can normalize the port handling used by PM2 and similar process managers.

## Analytics and Consent

Curator loads Google Analytics only after the visitor accepts analytics cookies from the consent banner.

Required env if you want analytics enabled:

```bash
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## Sentry

Curator uses `@sentry/nextjs` for browser/server error monitoring, tracing, logs, and Session Replay.

Required runtime env:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://...
```

Recommended server env:

```bash
SENTRY_DSN=https://...
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Optional Session Replay env overrides:

```bash
NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE=1
NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE=1
```

By default, when `NEXT_PUBLIC_SENTRY_DSN` is configured, Curator records full browser sessions and error-triggered replays, and sends them through the app's `/monitoring` tunnel route to reduce ad-blocker loss.

Optional build-time source map upload:

```bash
SENTRY_RELEASE_MANAGEMENT_ENABLED=true
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

Release management is opt-in. Curator only uploads source maps when `SENTRY_RELEASE_MANAGEMENT_ENABLED=true` and the three Sentry build credentials are set. Otherwise, the app still builds and runs normally.

Quick verification:

1. Start the app with a DSN configured.
2. Trigger a client error from the UI or call `throw new Error("Sentry test error")` in a browser click handler.
3. Confirm the issue appears in Sentry with the correct environment.

## Search Indexing

Curator now exposes:

- `robots.txt` via `app/robots.ts`
- `sitemap.xml` via `app/sitemap.ts`
- Open Graph metadata and share image routes
- an IndexNow key file at `/indexnow-key.txt`

Required env vars for IndexNow:

```bash
INDEXNOW_KEY=your-generated-key
NEXT_PUBLIC_SITE_URL=https://curatorfrc.com
```

Manual submission:

```bash
npm run indexnow:submit
```

Custom URLs:

```bash
npm run indexnow:submit -- /privacy-policy /terms-of-service
```

Optional startup submission:

```bash
INDEXNOW_SUBMIT_ON_START=true
INDEXNOW_SUBMIT_DELAY_MS=5000
```

That startup hook runs once per process start and is intended for deploy/restart workflows, not per-request notifications.

## Google Search Console

Curator supports Search Console verification through the App Router metadata API.

Set:

```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google-site-verification-token
```

That value is emitted as the Google site verification meta tag from `app/layout.tsx`.

## Notes

- Admin pages, admin APIs, and shared chat pages are marked `noindex` and also emit `X-Robots-Tag` headers.
- The support form writes to `support_requests`, and the admin ops page reads `support_requests` plus `app_logs`.
- Database-enforced RLS is forced on app data tables that use policy-based access control, including conversations, messages, reports, support requests, app logs, documents, document chunks, banned IPs, and rate-limit buckets. Auth/account tables still rely on framework-level access control.
- Admin stats are cached for 5 minutes through `lib/admin-stats.ts`, admin chats/users/reports are cached for 60 seconds through `lib/admin-cache.ts`, admin documents are cached for 5 minutes through `lib/admin-cache.ts`, public markdown pages are cached for 1 hour through `lib/markdown.ts`, and unauthenticated public shared-chat reads are cached for 5 minutes through `lib/public-conversations.ts`.
- Rate limiting remains Postgres-backed through `lib/rate-limit.ts` and now covers mutating and high-cost routes across chat, conversations, reports, support, admin moderation, document operations, and document access. Convex is not configured in this repo.
- Cookie preferences can be changed later from the in-app settings menu; revoking analytics consent clears GA cookies and disables future analytics collection.
- If you change features that affect privacy, cookies, data retention, or third-party services, update `public/privacy-policy.md` and `public/terms-of-service.md` in the same change.
