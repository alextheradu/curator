# Curator – Copilot Review Instructions

## Stack
Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Auth.js (Google and Apple OAuth),
PostgreSQL + Drizzle ORM, Qdrant vector search, MinIO storage, OpenRouter AI,
LangSearch web search, The Blue Alliance MCP, Sentry, Vitest.

---

## Security (strict — flag any violation)

### Auth & Admin
- All admin API routes must verify session AND that the user's email is in ADMIN_EMAILS.
  Never trust client-supplied role claims.
- Auth.js session tokens must never be exposed beyond what NextAuth surfaces by default.
- CSRF tokens (authjs.csrf-token) must be present and validated on all state-mutating auth flows.
- Google OAuth redirect URIs must be hardcoded or validated against an allowlist — never
  user-supplied.

### API Routes & Input
- Every API route must validate and sanitize all inputs. Flag any route missing validation.
- No raw SQL string interpolation — all DB queries must go through Drizzle's parameterized API.
- File uploads (MinIO) must enforce file type and size limits server-side, not just client-side.
- Rate limiting must be applied on: chat endpoints, document upload, support requests, feedback,
  and any other user-facing write operation.
- API responses must never include raw stack traces, internal error messages, or PII.

### AI & RAG
- User chat input must be sanitized before being passed to OpenRouter (prompt injection risk).
- Qdrant queries must have result limits — flag unbounded vector searches.
- Document retrieval must enforce access control: regular users must never receive
  admin-only documents.
- OpenRouter errors must be caught and handled gracefully — never surfaced raw to the user.

### Secrets & Credentials
- No API keys, secrets, or credentials hardcoded anywhere in source.
- Flag any string that pattern-matches a key (e.g. starts with sk-, sntrys_, AIza, etc.).
- Sentry captures must never include raw user chat messages or PII.
- Support request handlers must not log or return sensitive submitted data beyond what is
  needed for the support record.

### Shared Chats
- Shared chat access must be validated on every request — sharing state is stored server-side
  and must be re-checked, not cached client-side.
- Shared chat responses must never leak authenticated-user-only fields (account ID, email, etc.).

---

## Content & Community Standards

### Language & Comments
- Flag any profanity, vulgarity, slurs, or offensive language anywhere in the codebase:
  source files, comments, commit messages, variable names, string literals, log messages,
  error messages, UI copy, and test fixtures.
- Flag any harassing, threatening, or inappropriate content in UI strings or test data.
- This app serves FRC students (minors included) — all user-facing language must be
  appropriate for a school-age audience.

### Moderation Logic
- The automatic moderation scanner (flags profanity, harassment, threats, sexual content)
  must be applied consistently to all user-generated content paths, not just the primary
  chat flow.
- Moderation report records must not expose other users' data in admin responses beyond
  what is necessary for the review.

---

## Privacy Policy Accuracy
The Privacy Policy (public/privacy-policy.md, last updated May 8, 2026) lists the following.
Flag any PR that changes behavior in these areas without a corresponding update to the policy
and a bumped "Last updated" date:

- Cookies set or read (tos_accepted, guest_message_count, cookie_consent, sidebar_state,
  sidebar_width, authjs.* tokens, _ga/_ga_*)
- Data sent to third parties: OpenRouter, The Blue Alliance, LangSearch, Sentry, Cloudflare
  Web Analytics, Google Analytics, IndexNow, MinIO (self-hosted)
- New data fields stored in PostgreSQL for users, conversations, projects, moderation,
  support, or feedback
- Changes to data retention periods (server logs: 30 days, rate-limit counters: 7 days, etc.)
- Guest vs. authenticated data handling (guest chat in localStorage only — must never be
  persisted server-side)
- Analytics consent gating — Google Analytics must only load after cookie consent is accepted
- Session Replay tunneling through /_events — any change to that route affects the policy

---

## Terms of Service Accuracy
The Terms of Service (public/terms-of-service.md, last updated May 9, 2026) must stay in
sync with the actual service behavior. Flag any PR that changes:

- What the Service does (new features, new integrations, removed capabilities)
- How OpenRouter/upstream model providers handle prompts (free-tier model logging behavior)
- The guest message limit or account requirement
- The public chat sharing model
- The acceptable use rules (profanity, secrets in chat, AI replication prohibition)
- Moderation and termination behavior (manual + automated signals)
- The blog and admin authorship feature

---

## What to skip
- Tailwind class ordering
- Formatting / whitespace
- Naming conventions (unless a name is offensive or misleading in a security context)
- JSDoc completeness on non-critical internal utilities