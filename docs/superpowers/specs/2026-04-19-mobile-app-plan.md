# Curator Mobile App Plan
_Last updated: 2026-04-19_

## Approach

Keep Next.js API routes as the backend. React Native hits `https://yourhost/api/*` directly with JWT bearer tokens. No separate API service needed at this stage.

---

## Phase 1 — API Hardening (prerequisite, done in web repo)

These changes happen in the existing Next.js codebase before any mobile work begins.

### Auth
- Add `POST /api/auth/mobile/google` endpoint
  - Accepts Google ID token from the native app
  - Verifies token with Google's tokeninfo endpoint
  - Finds or creates user in DB
  - Returns a signed JWT (HS256, secret from env)
- Audit all existing API routes: ensure they accept `Authorization: Bearer <jwt>` header in addition to session cookies
- Add `MOBILE_JWT_SECRET` env var

### Google Cloud Console
- Create new OAuth 2.0 client: type **iOS**, bundle ID to be set when app is created
- Create new OAuth 2.0 client: type **Android**, package name + SHA-1 to be set when app is created
- Web client stays unchanged
- All three clients share the same Google Cloud project and user pool

### API hardening checklist
- [ ] All `/api/chat/*` routes accept bearer JWT
- [ ] All `/api/conversations/*` routes accept bearer JWT
- [ ] Rate limiting on `/api/auth/mobile/google`
- [ ] JWT expiry: 30 days, refresh via re-auth with Google

---

## Phase 2 — React Native App (separate repository)

**Stack:** Expo + expo-router + TypeScript

### Repository structure
```
curator-mobile/
  app/
    (auth)/
      index.tsx        # Login screen
    (app)/
      _layout.tsx      # Tab navigator
      index.tsx        # Chat list
      chat/[id].tsx    # Chat screen
      new.tsx          # New chat
    _layout.tsx
  components/
  lib/
    api.ts             # Typed API client
    auth.ts            # Google OAuth + JWT storage
  constants/
    tokens.ts          # Colors, typography matching web app
```

### Screens
| Screen | Description |
|--------|-------------|
| Login | Google Sign-In button, same brand as web |
| Chat list | All user conversations, pull-to-refresh |
| Chat | Message thread + input bar, streaming responses |
| New chat | Season selector → starts conversation |

### Auth flow
1. User taps "Sign in with Google"
2. `expo-auth-session` opens Google OAuth with the iOS/Android client ID
3. Returns Google ID token
4. App calls `POST /api/auth/mobile/google` with the ID token
5. Receives app JWT, stored in `expo-secure-store`
6. All subsequent API calls include `Authorization: Bearer <jwt>`

### Design tokens
- Copy brand colors (`#0066B3` primary, background, foreground) into `constants/tokens.ts`
- Use React Native StyleSheet — no Tailwind on native
- Match the web app's card/surface visual language using React Native Shadow

### Features in scope for v1
- View and create conversations
- Season selector
- Streaming chat responses (SSE or polling fallback)
- Conversation list with AI-generated titles

### Features out of scope for v1
- Admin panel (web-only)
- Document upload
- PDF viewer / citations
- Push notifications

---

## Phase 3 — Shared Types (optional, later)

Extract API request/response types into a shared package:

```
curator-api-types/   # or packages/api-types in a monorepo
  src/
    conversations.ts
    messages.ts
    auth.ts
```

Both the Next.js web app and the React Native app import from this package. Ensures end-to-end type safety without duplicating interfaces.

This phase is optional and only worth doing if the mobile app reaches active development — avoid premature monorepo complexity.

---

## Timeline Suggestion

| Phase | Depends on | Effort estimate |
|-------|------------|-----------------|
| Phase 1 — API hardening | Nothing | 1–2 days |
| Phase 2 — React Native app | Phase 1 complete | 2–4 weeks |
| Phase 3 — Shared types | Phase 2 stable | 2–3 days |
