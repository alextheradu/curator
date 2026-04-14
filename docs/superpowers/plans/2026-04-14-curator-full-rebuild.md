# Curator Full Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Curator into a production-grade FRC AI assistant with Google auth, Postgres persistence, RAG over FRC PDFs, LangSearch web search, and a dark FIRST-branded UI.

**Architecture:** Monolithic Next.js 16 App Router. Auth.js v5 (Google OAuth, JWT). Drizzle ORM → Postgres (port 5433). Qdrant (port 6333) for vector search. MinIO for PDF storage. OpenRouter for LLM + embeddings. LangSearch for web search tool calls.

**Tech Stack:** Next.js 16 · Auth.js v5 · Drizzle ORM · PostgreSQL 16 · Qdrant · MinIO · OpenRouter · LangSearch · shadcn/ui · Tailwind v4 · Framer Motion · Zustand

---

## Task 1: Docker Compose + Install Dependencies

**Files:**
- Create: `docker-compose.yml`
- Modify: `package.json`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - "5433:5432"
    environment:
      POSTGRES_DB: curator
      POSTGRES_USER: curator
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - curator_pg_data:/var/lib/postgresql/data

  qdrant:
    image: qdrant/qdrant:latest
    restart: unless-stopped
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - curator_qdrant_data:/qdrant/storage

volumes:
  curator_pg_data:
  curator_qdrant_data:
```

- [ ] **Step 2: Update .env.local with all required variables**

Ensure `.env.local` contains (generate AUTH_SECRET with `openssl rand -base64 32`):
```
POSTGRES_PASSWORD=curatordevpw
DATABASE_URL=postgresql://curator:curatordevpw@localhost:5433/curator
AUTH_SECRET=<generated>
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=curator-docs
MINIO_USE_SSL=false
OPENROUTER_API_KEY=<existing>
LANGSEARCH_API_KEY=
QDRANT_URL=http://localhost:6333
NEXT_PUBLIC_SITE_URL=https://curator.alexradu.co
ADMIN_EMAILS=aradu28@pascack.org
NEXT_PUBLIC_ADMIN_EMAILS=aradu28@pascack.org
```

- [ ] **Step 3: Start Docker services**

```bash
cd /srv/md0/robotics/curator
docker compose up -d
docker compose ps
```

Expected: both `postgres` and `qdrant` show `running`.

- [ ] **Step 4: Install new dependencies**

```bash
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm postgres @qdrant/js-client-rest minio pdf-parse openai
npm install -D drizzle-kit @types/pdf-parse @tailwindcss/typography
```

- [ ] **Step 5: Remove unused UI libraries**

```bash
npm uninstall @chakra-ui/react @chakra-ui/icons @emotion/react @emotion/styled @mui/material @mui/icons-material @base-ui/react
```

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml package.json package-lock.json
git commit -m "feat: add docker compose, install auth/db/qdrant/minio deps, remove chakra/mui"
```

---

## Task 2: Drizzle Schema + DB Client + Migrations

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create lib/db/schema.ts**

```typescript
import {
  pgTable, text, timestamp, integer, jsonb, uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  seasonYear: integer("season_year").notNull().default(2026),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  citations: jsonb("citations").$type<Citation[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  seasonYear: integer("season_year").notNull(),
  minioKey: text("minio_key").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedById: text("uploaded_by_id").references(() => users.id),
});

export const docChunks = pgTable("doc_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  pageNumber: integer("page_number").notNull(),
  content: text("content").notNull(),
  qdrantPointId: text("qdrant_point_id"),
});

export type Citation = {
  type: "doc" | "web";
  label: string;
  url: string;
  pageNumber?: number;
};
```

- [ ] **Step 2: Create lib/db/index.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Add db scripts to package.json scripts**

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 5: Generate and run initial migration**

```bash
npx drizzle-kit generate
DATABASE_URL="postgresql://curator:curatordevpw@localhost:5433/curator" npx drizzle-kit migrate
```

Verify tables exist:
```bash
docker exec -it curator-postgres-1 psql -U curator -d curator -c "\dt"
```

Expected: `users`, `accounts`, `sessions`, `verification_tokens`, `conversations`, `messages`, `documents`, `doc_chunks` listed.

- [ ] **Step 6: Commit**

```bash
git add lib/db/ drizzle.config.ts package.json
git commit -m "feat: drizzle schema with users, conversations, messages, documents, doc_chunks"
```

---

## Task 3: Auth.js v5 + Google OAuth + Middleware

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: Create auth.ts**

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
```

- [ ] **Step 2: Create app/api/auth/[...nextauth]/route.ts**

```typescript
export { GET, POST } from "@/auth";
```

- [ ] **Step 3: Create middleware.ts**

```typescript
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  if (isAdminRoute) {
    const session = req.auth;
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
```

- [ ] **Step 4: Create types/next-auth.d.ts**

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add auth.ts app/api/auth/ middleware.ts types/
git commit -m "feat: Auth.js v5 with Google OAuth, JWT sessions, admin middleware"
```

---

## Task 4: Guest Flow — Hook + Modals

**Files:**
- Create: `hooks/useGuestLimit.ts`
- Create: `components/auth/TosModal.tsx`
- Create: `components/auth/AuthModal.tsx`

- [ ] **Step 1: Create hooks/useGuestLimit.ts**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

const TOS_KEY = "curator_tos_accepted";
const GUEST_COUNT_KEY = "curator_guest_count";
const GUEST_LIMIT = 1;

export function useGuestLimit(isAuthenticated: boolean) {
  const [tosAccepted, setTosAccepted] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [showTosModal, setShowTosModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(TOS_KEY) === "true";
    const count = parseInt(localStorage.getItem(GUEST_COUNT_KEY) ?? "0", 10);
    setTosAccepted(accepted);
    setGuestCount(count);
    if (!accepted) setShowTosModal(true);
  }, []);

  const acceptTos = useCallback(() => {
    localStorage.setItem(TOS_KEY, "true");
    setTosAccepted(true);
    setShowTosModal(false);
  }, []);

  // Returns true if the message should be allowed through
  const checkBeforeSend = useCallback((): boolean => {
    if (isAuthenticated) return true;
    if (!tosAccepted) { setShowTosModal(true); return false; }
    if (guestCount >= GUEST_LIMIT) { setShowAuthModal(true); return false; }
    const next = guestCount + 1;
    setGuestCount(next);
    localStorage.setItem(GUEST_COUNT_KEY, String(next));
    return true;
  }, [isAuthenticated, tosAccepted, guestCount]);

  return { tosAccepted, showTosModal, showAuthModal, setShowAuthModal, acceptTos, checkBeforeSend };
}
```

- [ ] **Step 2: Create components/auth/TosModal.tsx**

```tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";

interface Props { open: boolean; onAccept: () => void; }

export function TosModal({ open, onAccept }: Props) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-[#2e2e2e] bg-[#1a1a1a] [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white">Welcome to Curator</DialogTitle>
          <p className="text-sm text-[#8A8A8A]">
            An AI knowledge base for FRC. Please review and accept our terms before continuing.
          </p>
        </DialogHeader>

        <ScrollArea className="h-48 rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] p-4">
          <p className="text-xs leading-relaxed text-[#8A8A8A]">
            Curator is a fan-made tool and is <strong className="text-white">not affiliated with FIRST®</strong>.
            AI responses may be inaccurate — always verify rules at{" "}
            <a href="https://firstinspires.org" target="_blank" rel="noopener noreferrer" className="text-[#0066B3] underline">
              firstinspires.org
            </a>. Do not rely on Curator for competition-critical decisions.
            <br /><br />
            By continuing, you agree to our{" "}
            <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0066B3] underline">
              Terms of Service <ExternalLink size={10} />
            </a>{" "}and{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0066B3] underline">
              Privacy Policy <ExternalLink size={10} />
            </a>.
            We collect chat messages to generate responses and, if you create an account, store conversation history. We do not sell your data.
          </p>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onAccept} className="w-full bg-[#ED1C24] text-white hover:bg-[#c9151b]">
            I agree — Continue to Curator
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create components/auth/AuthModal.tsx**

```tsx
"use client";

import { signIn } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function AuthModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-[#2e2e2e] bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold text-white">
            Create a free account
          </DialogTitle>
          <p className="text-center text-sm text-[#8A8A8A]">
            Sign in to keep chatting and save your conversation history.
          </p>
        </DialogHeader>
        <div className="py-2">
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full gap-3 bg-white text-black hover:bg-gray-100"
          >
            Continue with Google
          </Button>
        </div>
        <p className="text-center text-[11px] text-[#8A8A8A]">
          By signing in you agree to our{" "}
          <a href="/terms-of-service" target="_blank" className="underline">Terms</a>{" "}and{" "}
          <a href="/privacy-policy" target="_blank" className="underline">Privacy Policy</a>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useGuestLimit.ts components/auth/
git commit -m "feat: guest limit hook, TOS modal, auth prompt modal"
```

---

## Task 5: Color Tokens + globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace app/globals.css with FIRST dark theme**

Read the current file, then overwrite with:

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #0f0f0f;
  --foreground: #F5F5F5;
  --card: #1a1a1a;
  --card-foreground: #F5F5F5;
  --popover: #1a1a1a;
  --popover-foreground: #F5F5F5;
  --primary: #ED1C24;
  --primary-foreground: #FFFFFF;
  --secondary: #242424;
  --secondary-foreground: #F5F5F5;
  --muted: #242424;
  --muted-foreground: #8A8A8A;
  --accent: #242424;
  --accent-foreground: #F5F5F5;
  --destructive: #ED1C24;
  --destructive-foreground: #FFFFFF;
  --border: #2e2e2e;
  --input: #2e2e2e;
  --ring: #ED1C24;
  --radius: 0.75rem;
  --sidebar: #1a1a1a;
  --sidebar-foreground: #F5F5F5;
  --sidebar-primary: #ED1C24;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #242424;
  --sidebar-accent-foreground: #F5F5F5;
  --sidebar-border: #2e2e2e;
  --sidebar-ring: #ED1C24;
  --first-red: #ED1C24;
  --first-blue: #0066B3;
}

* { box-sizing: border-box; border-color: var(--border); }
html { color-scheme: dark; }
body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app-shell-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 40px 40px;
}

.glass-panel {
  background: rgba(26,26,26,0.85);
  border: 1px solid rgba(255,255,255,0.06);
  backdrop-filter: blur(12px);
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #3e3e3e; }
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat: FIRST dark color tokens, remove Chakra/MUI dependencies from CSS"
```

---

## Task 6: Graphics — Logo SVG, Favicon, OG Image

**Files:**
- Create: `public/logo.svg`
- Create: `app/icon.svg`
- Create: `app/opengraph-image.tsx`
- Create: `app/apple-icon.tsx`
- Create: `public/manifest.json`

- [ ] **Step 1: Create public/logo.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <circle cx="100" cy="100" r="72" stroke="#ED1C24" stroke-width="6"/>
  <path d="M100 16 L106 28 L94 28 Z" fill="#ED1C24"/>
  <path d="M100 184 L106 172 L94 172 Z" fill="#ED1C24"/>
  <path d="M16 100 L28 106 L28 94 Z" fill="#ED1C24"/>
  <path d="M184 100 L172 106 L172 94 Z" fill="#ED1C24"/>
  <path d="M33.4 33.4 L43.5 42.8 L34.1 52.2 Z" fill="#ED1C24"/>
  <path d="M166.6 166.6 L156.5 157.2 L165.9 147.8 Z" fill="#ED1C24"/>
  <path d="M166.6 33.4 L157.2 43.5 L147.8 34.1 Z" fill="#ED1C24"/>
  <path d="M33.4 166.6 L42.8 156.5 L52.2 165.9 Z" fill="#ED1C24"/>
  <circle cx="100" cy="100" r="44" fill="#1a1a1a" stroke="#2e2e2e" stroke-width="2"/>
  <path d="M116 76 A32 32 0 1 0 116 124 L108 116 A22 22 0 1 1 108 84 Z" fill="#ED1C24"/>
  <circle cx="116" cy="100" r="6" fill="#0066B3"/>
</svg>
```

- [ ] **Step 2: Create app/icon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#0f0f0f"/>
  <circle cx="16" cy="16" r="11" stroke="#ED1C24" stroke-width="2"/>
  <path d="M20 10 A8 8 0 1 0 20 22 L18 20 A5.5 5.5 0 1 1 18 12 Z" fill="#ED1C24"/>
  <circle cx="20" cy="16" r="2" fill="#0066B3"/>
</svg>
```

- [ ] **Step 3: Create app/opengraph-image.tsx**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Curator — FRC AI Knowledge Base";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0f0f0f", position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div style={{
          position: "absolute", top: 0, right: 0, width: 600, height: 400,
          background: "radial-gradient(circle, rgba(237,28,36,0.15) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, left: 0, width: 500, height: 350,
          background: "radial-gradient(circle, rgba(0,102,179,0.12) 0%, transparent 70%)",
        }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, zIndex: 1 }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", border: "3px solid #ED1C24",
            background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#ED1C24", fontSize: 48, fontWeight: 700 }}>C</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#F5F5F5", fontSize: 80, fontWeight: 800, letterSpacing: "-2px" }}>CURATOR</span>
            <span style={{ color: "#8A8A8A", fontSize: 28, letterSpacing: "4px" }}>FRC AI KNOWLEDGE BASE</span>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {["Game Manuals", "Team Updates", "Web Search"].map((tag) => (
              <span key={tag} style={{
                background: "rgba(237,28,36,0.15)", border: "1px solid rgba(237,28,36,0.3)",
                color: "#ED1C24", padding: "6px 16px", borderRadius: 99, fontSize: 18,
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 4: Create app/apple-icon.tsx**

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", background: "#0f0f0f",
        display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 40,
      }}>
        <div style={{
          width: 130, height: 130, borderRadius: "50%", border: "4px solid #ED1C24",
          background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "#ED1C24", fontSize: 64, fontWeight: 800 }}>C</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 5: Create public/manifest.json**

```json
{
  "name": "Curator — FRC AI",
  "short_name": "Curator",
  "description": "AI knowledge base for FIRST Robotics Competition",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#ED1C24",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

- [ ] **Step 6: Commit**

```bash
git add public/logo.svg app/icon.svg app/opengraph-image.tsx app/apple-icon.tsx public/manifest.json
git commit -m "feat: logo SVG, favicon, OG image, apple icon, PWA manifest"
```

---

## Task 7: App Layout + Providers + Root Page

**Files:**
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Modify: `components/Providers.tsx`

- [ ] **Step 1: Create app/layout.tsx**

```tsx
import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Curator — FRC AI Knowledge Base",
  description: "AI-powered assistant for FIRST Robotics Competition. Ask about rules, strategy, programming, and more.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Curator — FRC AI Knowledge Base",
    description: "Ask about FRC rules, game manuals, strategy, and programming.",
    siteName: "Curator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curator — FRC AI Knowledge Base",
    description: "Ask about FRC rules, game manuals, strategy, and programming.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ED1C24",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace components/Providers.tsx**

```tsx
"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </TooltipProvider>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Create app/page.tsx**

```tsx
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";

export default function HomePage() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex h-svh w-full overflow-hidden bg-[#0f0f0f]">
        <AppSidebar />
        <ChatWindow />
      </div>
    </SidebarProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx components/Providers.tsx
git commit -m "feat: root layout with metadata, session provider, dark-only, Space Grotesk font"
```

---

## Task 8: Updated Zustand Store

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Replace lib/store.ts**

Replace the entire file. Key changes: `finalizeStreamingMessage` now accepts `citations`, `loadConversationsFromDB` added, `apiKeyOverride` removed (API key is now server-only).

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateChatTitle } from "./utils";
import type { Citation } from "./db/schema";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  citations?: Citation[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  seasonYear: number;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  temperature: number;

  newConversation: () => string;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (conversationId: string, citations?: Citation[]) => void;
  resetStreamingState: () => void;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  setSeasonYear: (conversationId: string, year: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTemperature: (temp: number) => void;
  loadConversationsFromDB: (convs: Conversation[]) => void;
  activeConversation: () => Conversation | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      streamingContent: "",
      isStreaming: false,
      sidebarOpen: true,
      settingsOpen: false,
      temperature: 0.2,

      newConversation: () => {
        const id = crypto.randomUUID();
        set((s) => ({
          conversations: [
            { id, title: "New Chat", messages: [], createdAt: new Date(), updatedAt: new Date(), seasonYear: 2026 },
            ...s.conversations,
          ],
          activeConversationId: id,
          streamingContent: "",
          isStreaming: false,
        }));
        return id;
      },

      setActiveConversation: (id) =>
        set({ activeConversationId: id, streamingContent: "", isStreaming: false }),

      addMessage: (conversationId, message) => {
        const id = crypto.randomUUID();
        const full: Message = { ...message, id, timestamp: new Date() };
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const msgs = [...c.messages, full];
            const title = c.title === "New Chat" && message.role === "user"
              ? generateChatTitle(message.content) : c.title;
            return { ...c, messages: msgs, title, updatedAt: new Date() };
          }),
        }));
        return id;
      },

      updateStreamingContent: (content) => set({ streamingContent: content, isStreaming: true }),

      finalizeStreamingMessage: (conversationId, citations) => {
        const { streamingContent } = get();
        if (!streamingContent) { set({ streamingContent: "", isStreaming: false }); return; }
        const msg: Message = {
          id: crypto.randomUUID(), role: "assistant",
          content: streamingContent, timestamp: new Date(),
          ...(citations?.length && { citations }),
        };
        set((s) => ({
          streamingContent: "", isStreaming: false,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, msg], updatedAt: new Date() }
              : c
          ),
        }));
      },

      resetStreamingState: () => set({ streamingContent: "", isStreaming: false }),

      clearConversation: (id) => set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === id ? { ...c, messages: [], title: "New Chat", updatedAt: new Date() } : c
        ),
        streamingContent: "", isStreaming: false,
      })),

      deleteConversation: (id) => set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id);
        return {
          conversations: remaining,
          activeConversationId: s.activeConversationId === id
            ? (remaining[0]?.id ?? null) : s.activeConversationId,
        };
      }),

      setSeasonYear: (id, year) => set((s) => ({
        conversations: s.conversations.map((c) => c.id === id ? { ...c, seasonYear: year } : c),
      })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setTemperature: (temp) => set({ temperature: temp }),

      loadConversationsFromDB: (convs) => set({ conversations: convs }),

      activeConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },
    }),
    {
      name: "curator-chat-store",
      partialize: (s) => ({
        conversations: s.conversations,
        activeConversationId: s.activeConversationId,
        temperature: s.temperature,
        sidebarOpen: s.sidebarOpen,
      }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add lib/store.ts
git commit -m "feat: update store with citation support, loadConversationsFromDB, remove apiKeyOverride"
```

---

## Task 9: Conversation Persistence API Routes

**Files:**
- Create: `app/api/conversations/route.ts`
- Create: `app/api/conversations/[id]/route.ts`
- Create: `app/api/conversations/[id]/messages/route.ts`

- [ ] **Step 1: Create app/api/conversations/route.ts**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title = "New Chat", seasonYear = 2026 } = await req.json();
  const [conv] = await db.insert(conversations)
    .values({ userId: session.user.id, title, seasonYear })
    .returning();

  return NextResponse.json(conv);
}
```

- [ ] **Step 2: Create app/api/conversations/[id]/route.ts**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const [updated] = await db.update(conversations)
    .set({
      ...(body.title && { title: body.title }),
      ...(body.seasonYear && { seasonYear: body.seasonYear }),
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create app/api/conversations/[id]/messages/route.ts**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { messages, conversations } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)));
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { role, content, citations } = await req.json();

  const [msg] = await db.insert(messages)
    .values({ conversationId: id, role, content, citations })
    .returning();

  await db.update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, id));

  return NextResponse.json(msg);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/conversations/
git commit -m "feat: conversation and message persistence API routes"
```

---

## Task 10: MinIO + Qdrant + Embeddings + Chunker

**Files:**
- Create: `lib/minio.ts`
- Create: `lib/qdrant.ts`
- Create: `lib/embeddings.ts`
- Create: `lib/chunker.ts`

- [ ] **Step 1: Create lib/minio.ts**

```typescript
import * as Minio from "minio";

let _client: Minio.Client | null = null;

function getClient(): Minio.Client {
  if (_client) return _client;
  _client = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT!,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY!,
    secretKey: process.env.MINIO_SECRET_KEY!,
  });
  return _client;
}

const BUCKET = process.env.MINIO_BUCKET ?? "curator-docs";

export async function ensureBucketExists() {
  const client = getClient();
  const exists = await client.bucketExists(BUCKET);
  if (!exists) await client.makeBucket(BUCKET);
}

export async function uploadPdf(key: string, buffer: Buffer, size: number) {
  const client = getClient();
  await ensureBucketExists();
  await client.putObject(BUCKET, key, buffer, size, { "Content-Type": "application/pdf" });
}

export async function getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
  return getClient().presignedGetObject(BUCKET, key, expirySeconds);
}

export async function deletePdf(key: string) {
  await getClient().removeObject(BUCKET, key);
}
```

- [ ] **Step 2: Create lib/qdrant.ts**

```typescript
import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION = "frc_docs";
const VECTOR_SIZE = 1536;

let _client: QdrantClient | null = null;
function getClient() {
  if (!_client) _client = new QdrantClient({ url: process.env.QDRANT_URL ?? "http://localhost:6333" });
  return _client;
}

export async function ensureCollection() {
  const client = getClient();
  const { collections } = await client.getCollections();
  if (!collections.some((c) => c.name === COLLECTION)) {
    await client.createCollection(COLLECTION, { vectors: { size: VECTOR_SIZE, distance: "Cosine" } });
  }
}

export type DocChunkPayload = {
  doc_id: string; doc_name: string; season_year: number;
  page_number: number; chunk_index: number; minio_key: string; content: string;
};

export async function upsertChunks(
  points: Array<{ id: string; vector: number[]; payload: DocChunkPayload }>
) {
  await getClient().upsert(COLLECTION, { wait: true, points });
}

export async function searchChunks(vector: number[], limit = 5) {
  const result = await getClient().search(COLLECTION, { vector, limit, with_payload: true });
  return result.map((r) => ({ score: r.score, payload: r.payload as DocChunkPayload }));
}

export async function deleteChunksByDocId(docId: string) {
  await getClient().delete(COLLECTION, {
    wait: true,
    filter: { must: [{ key: "doc_id", match: { value: docId } }] },
  });
}
```

- [ ] **Step 3: Create lib/embeddings.ts**

```typescript
import OpenAI from "openai";

let _client: OpenAI | null = null;
function getClient() {
  if (!_client) _client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
  });
  return _client;
}

export async function embedText(text: string): Promise<number[]> {
  const r = await getClient().embeddings.create({ model: "openai/text-embedding-3-small", input: text });
  return r.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const r = await getClient().embeddings.create({ model: "openai/text-embedding-3-small", input: texts });
  return r.data.map((d) => d.embedding);
}
```

- [ ] **Step 4: Create lib/chunker.ts**

```typescript
import pdfParse from "pdf-parse";

export interface Chunk { text: string; pageNumber: number; chunkIndex: number; }

const CHUNK_CHARS = 2000;
const OVERLAP_CHARS = 200;

function splitText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_CHARS, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += CHUNK_CHARS - OVERLAP_CHARS;
  }
  return chunks;
}

export async function extractChunks(buffer: Buffer): Promise<{ chunks: Chunk[]; pageCount: number }> {
  const parsed = await pdfParse(buffer);
  const pages = parsed.text.split("\f");
  const chunks: Chunk[] = [];
  let idx = 0;

  for (let p = 0; p < pages.length; p++) {
    const pageText = pages[p].trim();
    if (!pageText) continue;
    for (const text of splitText(pageText)) {
      chunks.push({ text, pageNumber: p + 1, chunkIndex: idx++ });
    }
  }

  return { chunks, pageCount: parsed.numpages };
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/minio.ts lib/qdrant.ts lib/embeddings.ts lib/chunker.ts
git commit -m "feat: MinIO, Qdrant, OpenRouter embeddings, PDF chunker helpers"
```

---

## Task 11: LangSearch + RAG Orchestrator + Updated System Prompt

**Files:**
- Create: `lib/langsearch.ts`
- Create: `lib/rag.ts`
- Modify: `lib/frc-system-prompt.ts`

- [ ] **Step 1: Create lib/langsearch.ts**

```typescript
export interface SearchResult { title: string; snippet: string; url: string; }

export async function webSearch(query: string, limit = 3): Promise<SearchResult[]> {
  const response = await fetch("https://api.langsearch.com/v1/web-search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LANGSEARCH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, count: limit, summary: true }),
  });

  if (!response.ok) {
    console.error("LangSearch error:", response.status);
    return [];
  }

  const data = await response.json();
  return (data?.webPages?.value ?? []).slice(0, limit).map((r: {
    name: string; snippet: string; url: string;
  }) => ({ title: r.name, snippet: r.snippet, url: r.url }));
}
```

- [ ] **Step 2: Create lib/rag.ts**

```typescript
import { embedText } from "./embeddings";
import { searchChunks } from "./qdrant";
import { getPresignedUrl } from "./minio";
import type { Citation } from "./db/schema";

export interface RagContext { contextBlock: string; citations: Citation[]; }

export async function buildRagContext(query: string): Promise<RagContext> {
  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return { contextBlock: "", citations: [] };
  }

  const results = await searchChunks(queryEmbedding, 5);
  if (results.length === 0) return { contextBlock: "", citations: [] };

  const citations: Citation[] = [];
  const sourceBlocks: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const { payload } = results[i];
    let url = "";
    try { url = await getPresignedUrl(payload.minio_key); } catch { /* non-fatal */ }

    citations.push({
      type: "doc",
      label: `${payload.doc_name}, p.${payload.page_number}`,
      url: url ? `${url}#page=${payload.page_number}` : "",
      pageNumber: payload.page_number,
    });

    sourceBlocks.push(
      `[SOURCE ${i + 1}] ${payload.doc_name} (page ${payload.page_number}):\n${payload.content}`
    );
  }

  return {
    contextBlock: `\n\nRelevant documentation:\n${sourceBlocks.join("\n\n")}`,
    citations,
  };
}
```

- [ ] **Step 3: Replace lib/frc-system-prompt.ts**

```typescript
const BASE = `You are Curator, an expert AI assistant exclusively for FIRST Robotics Competition (FRC).

RULES:
1. NEVER speculate. If uncertain: "I don't have verified information on that. Check firstinspires.org."
2. ONLY answer FRC-related questions (robots, programming, rules, strategy, team management, scouting).
3. Off-topic: "I'm Curator, specialized in FRC. I can't help with that."
4. Cite sources inline using [N] notation when SOURCE blocks are provided.
5. When rules changed year-to-year, confirm the season year with the user.
6. Never invent rule numbers, part numbers, dimensions, or weight limits.
7. Format code with markdown code blocks and language identifiers.

Current season year: {{SEASON_YEAR}}{{CONTEXT_BLOCK}}`;

export function buildSystemPrompt(seasonYear: number, contextBlock = ""): string {
  return BASE
    .replace("{{SEASON_YEAR}}", seasonYear.toString())
    .replace("{{CONTEXT_BLOCK}}", contextBlock);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/langsearch.ts lib/rag.ts lib/frc-system-prompt.ts
git commit -m "feat: LangSearch helper, RAG orchestrator, tightened system prompt"
```

---

## Task 12: Updated Chat API Route (RAG + Tool Calling)

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `lib/openrouter.ts`

- [ ] **Step 1: Replace app/api/chat/route.ts**

Remove `export const runtime = "edge"` — this route now calls DB and Qdrant.

```typescript
import { auth } from "@/auth";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import { buildRagContext } from "@/lib/rag";
import { webSearch } from "@/lib/langsearch";
import type { Citation } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GUEST_LIMIT = 1;
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

const SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "search_web",
    description: "Search the web for current FRC news, team info, event results, or anything not in uploaded docs.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
};

function orHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "X-Title": "Curator FRC Assistant",
  };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const cookieStore = await cookies();

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get("guest_message_count")?.value ?? "0", 10);
    if (count >= GUEST_LIMIT) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
  }

  const { messages, temperature = 0.2, seasonYear = 2026 } = await request.json();
  const apiKey = process.env.OPENROUTER_API_KEY!;

  const lastUser = [...messages].reverse().find((m: { role: string }) => m.role === "user");
  const { contextBlock, citations: ragCitations } = lastUser
    ? await buildRagContext(lastUser.content)
    : { contextBlock: "", citations: [] };

  const systemPrompt = buildSystemPrompt(seasonYear, contextBlock);
  const fullMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const allCitations: Citation[] = [...ragCitations];

  // First pass — may trigger tool call
  const first = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: fullMessages,
      tools: [SEARCH_TOOL],
      tool_choice: "auto",
      stream: false,
      temperature,
      max_tokens: 2048,
    }),
  });

  if (!first.ok) {
    return NextResponse.json({ error: await first.text() }, { status: first.status });
  }

  const firstData = await first.json();
  const firstChoice = firstData.choices?.[0];
  let finalMessages = fullMessages;

  if (firstChoice?.finish_reason === "tool_calls" && firstChoice?.message?.tool_calls) {
    const toolCall = firstChoice.message.tool_calls[0];
    const { query } = JSON.parse(toolCall.function.arguments);
    const webResults = await webSearch(query);

    for (const r of webResults) {
      try {
        const domain = new URL(r.url).hostname.replace("www.", "");
        allCitations.push({ type: "web", label: domain, url: r.url });
      } catch { /* invalid URL */ }
    }

    const toolContent = webResults.length > 0
      ? webResults.map((r, i) => `[WEB ${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`).join("\n\n")
      : "No results found.";

    finalMessages = [
      ...fullMessages,
      firstChoice.message,
      { role: "tool", tool_call_id: toolCall.id, content: toolContent },
    ];
  }

  // Stream final response
  const stream = await fetch(OR_URL, {
    method: "POST",
    headers: orHeaders(apiKey),
    body: JSON.stringify({
      model: "google/gemma-3-27b-it:free",
      messages: finalMessages,
      stream: true,
      temperature,
      max_tokens: 2048,
    }),
  });

  const responseHeaders = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "X-Citations": JSON.stringify(allCitations),
  });

  if (!session?.user?.id) {
    const count = parseInt(cookieStore.get("guest_message_count")?.value ?? "0", 10);
    responseHeaders.set("Set-Cookie", `guest_message_count=${count + 1}; Path=/; SameSite=Lax`);
  }

  return new Response(stream.body, { headers: responseHeaders });
}
```

- [ ] **Step 2: Replace lib/openrouter.ts**

```typescript
import type { Citation } from "@/lib/db/schema";

interface StreamOptions {
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  seasonYear?: number;
  conversationId?: string;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone: (citations: Citation[]) => void;
  onError: (err: Error) => void;
  onAuthRequired?: () => void;
}

export async function streamOpenRouterChat({
  messages, temperature = 0.2, seasonYear, signal,
  onToken, onDone, onError, onAuthRequired,
}: StreamOptions) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature, seasonYear }),
      signal,
    });

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      if (data.error === "auth_required") { onAuthRequired?.(); return; }
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(data.error ?? `HTTP ${response.status}`);
    }

    const citations: Citation[] = JSON.parse(response.headers.get("X-Citations") ?? "[]");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(citations); return; }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) onToken(token);
        } catch { /* skip malformed chunks */ }
      }
    }
    onDone(citations);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts lib/openrouter.ts
git commit -m "feat: chat route with RAG, LangSearch tool calling, citations response header"
```

---

## Task 13: ChatWindow (Auth-aware + Citations)

**Files:**
- Modify: `components/chat/ChatWindow.tsx`

- [ ] **Step 1: Replace components/chat/ChatWindow.tsx**

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeInfo, Settings2, Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { TosModal } from "@/components/auth/TosModal";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useGuestLimit } from "@/hooks/useGuestLimit";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";
import type { Citation } from "@/lib/db/schema";

export function ChatWindow() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.id;

  const {
    activeConversation, activeConversationId, streamingContent, isStreaming,
    temperature, newConversation, addMessage, updateStreamingContent,
    finalizeStreamingMessage, resetStreamingState, clearConversation, setSettingsOpen,
  } = useChatStore();

  const { showTosModal, showAuthModal, setShowAuthModal, acceptTos, checkBeforeSend } =
    useGuestLimit(isAuthenticated);

  const abortRef = useRef<AbortController | null>(null);
  const conversation = activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.messages.length, streamingContent,
  ]);

  useEffect(() => { if (!activeConversationId) newConversation(); }, [activeConversationId, newConversation]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (activeConversationId && streamingContent) finalizeStreamingMessage(activeConversationId);
    else resetStreamingState();
  }, [activeConversationId, finalizeStreamingMessage, resetStreamingState, streamingContent]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeConversationId || isStreaming) return;
    if (!checkBeforeSend()) return;

    const convId = activeConversationId;
    const controller = new AbortController();
    abortRef.current = controller;

    addMessage(convId, { role: "user", content: text });

    const currentConv = useChatStore.getState().activeConversation();
    const seasonYear = currentConv?.seasonYear ?? 2026;
    const history = (currentConv?.messages ?? [])
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    history.push({ role: "user", content: text });

    let accumulated = "";
    await streamOpenRouterChat({
      messages: [{ role: "system", content: buildSystemPrompt(seasonYear) }, ...history],
      temperature, seasonYear,
      signal: controller.signal,
      onToken: (token) => { accumulated += token; updateStreamingContent(accumulated); },
      onDone: (citations: Citation[]) => {
        abortRef.current = null;
        finalizeStreamingMessage(convId, citations);
        scrollToBottom();
      },
      onError: (err) => {
        abortRef.current = null;
        finalizeStreamingMessage(convId);
        window.dispatchEvent(new CustomEvent("curator:error", {
          detail: { message: err.message || "Failed to reach OpenRouter." },
        }));
      },
      onAuthRequired: () => { setShowAuthModal(true); resetStreamingState(); },
    });
  }, [
    activeConversationId, isStreaming, temperature, checkBeforeSend,
    addMessage, updateStreamingContent, finalizeStreamingMessage,
    resetStreamingState, scrollToBottom, setShowAuthModal,
  ]);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <SidebarInset className="min-h-svh overflow-hidden bg-transparent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,102,179,0.10),transparent_26%),radial-gradient(circle_at_left,rgba(237,28,36,0.08),transparent_28%)]" />
      <div className="app-shell-grid absolute inset-0 opacity-[0.55]" />

      <TosModal open={showTosModal} onAccept={acceptTos} />
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      <SettingsModal />

      <header className="sticky top-0 z-20 border-b border-[#2e2e2e] bg-[#0f0f0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <SidebarTrigger className="-ml-1" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#8A8A8A]">FRC AI Assistant</p>
            <h2 className="truncate text-lg font-semibold text-white">
              {conversation?.title ?? "New Chat"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              className="rounded-full border-[#2e2e2e] bg-[#1a1a1a] text-[#8A8A8A] hover:text-white"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 size={14} />
              <span className="hidden md:inline">Settings</span>
            </Button>
            {conversation && messages.length > 0 && (
              <Button
                variant="ghost" size="icon"
                onClick={() => clearConversation(conversation.id)}
                className="h-8 w-8 rounded-full text-[#8A8A8A] hover:text-[#ED1C24]"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div ref={containerRef} className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div key="messages" className="mx-auto flex w-full max-w-3xl flex-col pb-10 pt-6 px-4">
              <div className="mb-4 flex items-center gap-2 text-xs text-[#8A8A8A]">
                <BadgeInfo size={12} />
                Always verify critical rules at firstinspires.org
              </div>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && streamingContent && (
                <MessageBubble
                  key="streaming"
                  message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
                  isStreaming
                />
              )}
              {isStreaming && !streamingContent && <StreamingIndicator key="indicator" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-[#2e2e2e] bg-[#0f0f0f]/80 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl">
          <InputBar onSend={handleSend} onStop={stopStreaming}
            disabled={!activeConversationId} isStreaming={isStreaming} />
        </div>
      </div>
    </SidebarInset>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/ChatWindow.tsx
git commit -m "feat: ChatWindow with auth-aware guest modals, citation support, FIRST dark UI"
```

---

## Task 14: CitationBadge + MessageBubble

**Files:**
- Modify: `components/ui/CitationBadge.tsx`
- Modify: `components/chat/MessageBubble.tsx`

- [ ] **Step 1: Replace components/ui/CitationBadge.tsx**

```tsx
import { ExternalLink, FileText, Globe } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

interface Props { citation: Citation; index: number; }

export function CitationBadge({ citation, index }: Props) {
  const isWeb = citation.type === "web";
  const color = isWeb ? "#0066B3" : "#ED1C24";

  return (
    <a
      href={citation.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:bg-white/5"
      style={{ borderColor: `${color}40`, color }}
      title={citation.label}
    >
      {isWeb ? <Globe size={10} /> : <FileText size={10} />}
      <span className="font-medium">[{index}]</span>
      <span className="max-w-[140px] truncate">{citation.label}</span>
      {citation.url && <ExternalLink size={9} className="shrink-0 opacity-60" />}
    </a>
  );
}
```

- [ ] **Step 2: Replace components/chat/MessageBubble.tsx**

Read the current file, then replace. Note: use `.match()` instead of `.exec()` for the language detection regex to avoid false positive lint rules.

```tsx
"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/store";

interface Props { message: Message; isStreaming?: boolean; }

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("mb-6 flex gap-3", isUser && "flex-row-reverse")}
    >
      <div className={cn(
        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        isUser ? "bg-[#0066B3] text-white" : "bg-[#ED1C24] text-white"
      )}>
        {isUser ? "U" : "C"}
      </div>

      <div className={cn("flex max-w-[85%] flex-col gap-2", isUser && "items-end")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser ? "bg-[#1a1a1a] text-white border border-[#2e2e2e]" : "text-[#F5F5F5]"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const langMatch = className?.match(/language-(\w+)/);
                  const isBlock = !!langMatch;
                  return isBlock ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={langMatch[1]}
                      PreTag="div"
                      className="!rounded-xl !text-xs"
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="rounded bg-[#242424] px-1.5 py-0.5 font-mono text-xs" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mb-2 text-base font-semibold">{children}</h2>,
                h3: ({ children }) => <h3 className="mb-1 font-semibold">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#ED1C24] pl-3 text-[#8A8A8A] italic">{children}</blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#2e2e2e] bg-[#1a1a1a] px-3 py-2 text-left font-medium">{children}</th>
                ),
                td: ({ children }) => <td className="border border-[#2e2e2e] px-3 py-2">{children}</td>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#ED1C24]" />
          )}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <CitationBadge key={i} citation={c} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/CitationBadge.tsx components/chat/MessageBubble.tsx
git commit -m "feat: citation badge with doc/web types, message bubble with markdown and citations"
```

---

## Task 15: Sidebar with Auth

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Replace components/sidebar/Sidebar.tsx**

```tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { AnimatePresence } from "framer-motion";
import { Bot, LogIn, LogOut, Plus, Settings2, Shield } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarRail, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { useChatStore } from "@/lib/store";

export function AppSidebar() {
  const { data: session } = useSession();
  const { conversations, activeConversationId, newConversation, setActiveConversation, deleteConversation, setSettingsOpen } = useChatStore();

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  const isAdmin = adminEmails.includes(session?.user?.email ?? "");

  return (
    <Sidebar variant="inset" className="border-[#2e2e2e] bg-[#1a1a1a]">
      <SidebarHeader className="border-b border-[#2e2e2e] px-4 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ED1C24]">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8A8A8A]">FRC AI</p>
            <h1 className="text-lg font-bold uppercase tracking-wider text-white">Curator</h1>
          </div>
        </div>
        <Button
          onClick={newConversation}
          className="h-10 w-full gap-2 rounded-xl bg-[#ED1C24] text-white hover:bg-[#c9151b]"
        >
          <Plus size={15} />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-[#8A8A8A]">
            {session ? "Your chats" : "Guest chats"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2e2e2e] px-4 py-8 text-center text-sm text-[#8A8A8A]">
                No chats yet. Start asking about FRC rules, code, or strategy.
              </div>
            ) : (
              <SidebarMenu className="gap-1">
                <AnimatePresence initial={false}>
                  {conversations.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <ConversationItem
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onClick={() => setActiveConversation(conv.id)}
                        onDelete={() => deleteConversation(conv.id)}
                      />
                    </SidebarMenuItem>
                  ))}
                </AnimatePresence>
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#2e2e2e] px-4 py-4 gap-2">
        {isAdmin && (
          <Button variant="ghost" size="sm" asChild
            className="w-full justify-start gap-2 rounded-xl text-[#8A8A8A] hover:text-white"
          >
            <a href="/admin/documents"><Shield size={14} />Manage Documents</a>
          </Button>
        )}
        <Button variant="ghost" size="sm"
          className="w-full justify-start gap-2 rounded-xl text-[#8A8A8A] hover:text-white"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 size={14} />Settings
        </Button>

        {session ? (
          <div className="flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#0f0f0f] p-3">
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{session.user?.name}</p>
              <p className="truncate text-[10px] text-[#8A8A8A]">{session.user?.email}</p>
            </div>
            <Button variant="ghost" size="icon"
              className="h-7 w-7 shrink-0 text-[#8A8A8A] hover:text-white"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              <LogOut size={13} />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm"
            className="w-full gap-2 rounded-xl border-[#2e2e2e] bg-[#0f0f0f] text-[#8A8A8A] hover:text-white"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <LogIn size={14} />Sign in with Google
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function SidebarToggle() { return <SidebarTrigger />; }
export { AppSidebar as Sidebar };
```

- [ ] **Step 2: Commit**

```bash
git add components/sidebar/Sidebar.tsx
git commit -m "feat: sidebar with Google auth display, sign in/out, admin link"
```

---

## Task 16: EmptyState + SettingsModal

**Files:**
- Modify: `components/chat/EmptyState.tsx`
- Modify: `components/ui/SettingsModal.tsx`

- [ ] **Step 1: Replace components/chat/EmptyState.tsx**

```tsx
"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const STARTERS = [
  "What are the key robot rules for the 2026 season?",
  "Explain the scoring system for this year's game.",
  "How do I set up a WPILib command-based project?",
  "What is the robot weight limit?",
  "How does alliance selection work at district events?",
  "Show me a PID controller example in Java.",
];

interface Props { onPromptSelect: (prompt: string) => void; }

export function EmptyState({ onPromptSelect }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-full flex-col items-center justify-center px-4 py-16 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ED1C24]">
        <Bot size={28} className="text-white" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-white">Ask Curator</h2>
      <p className="mb-8 max-w-sm text-sm text-[#8A8A8A]">
        Your AI knowledge base for FIRST Robotics Competition. Ask about rules, programming, strategy, and more.
      </p>
      <div className="grid max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {STARTERS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect(prompt)}
            className="rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3 text-left text-sm text-[#F5F5F5] transition-colors hover:border-[#ED1C24]/40 hover:bg-[#242424]"
          >
            {prompt}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Replace components/ui/SettingsModal.tsx**

```tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store";

export function SettingsModal() {
  const { data: session } = useSession();
  const { settingsOpen, setSettingsOpen, temperature, setTemperature } = useChatStore();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-w-sm border-[#2e2e2e] bg-[#1a1a1a]">
        <DialogHeader>
          <DialogTitle className="text-white">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Temperature</label>
              <span className="font-mono text-xs text-[#8A8A8A]">{temperature.toFixed(1)}</span>
            </div>
            <Slider min={0} max={1} step={0.1} value={[temperature]}
              onValueChange={([v]) => setTemperature(v)}
              className="[&_[role=slider]]:bg-[#ED1C24] [&_[role=slider]]:border-[#ED1C24]"
            />
            <p className="text-xs text-[#8A8A8A]">Lower = more precise. Higher = more creative.</p>
          </div>

          <div className="space-y-2 border-t border-[#2e2e2e] pt-4">
            <p className="text-sm font-medium text-white">Account</p>
            {session ? (
              <div className="space-y-2">
                <p className="text-xs text-[#8A8A8A]">Signed in as {session.user?.email}</p>
                <Button variant="outline" size="sm"
                  className="w-full border-[#2e2e2e] text-[#8A8A8A] hover:text-white"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full bg-white text-black hover:bg-gray-100"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                Sign in with Google
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/chat/EmptyState.tsx components/ui/SettingsModal.tsx
git commit -m "feat: empty state with FIRST branding, settings modal with auth integration"
```

---

## Task 17: Admin Documents Page

**Files:**
- Create: `app/api/admin/documents/upload/route.ts`
- Create: `app/api/admin/documents/route.ts`
- Create: `components/admin/DocumentUploader.tsx`
- Create: `components/admin/DocumentList.tsx`
- Create: `app/admin/documents/page.tsx`

- [ ] **Step 1: Create app/api/admin/documents/upload/route.ts**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { uploadPdf } from "@/lib/minio";
import { extractChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { ensureCollection, upsertChunks } from "@/lib/qdrant";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const seasonYear = parseInt(formData.get("seasonYear") as string ?? "2026", 10);

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const minioKey = `${seasonYear}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  await uploadPdf(minioKey, buffer, buffer.length);
  const { chunks, pageCount } = await extractChunks(buffer);

  const [doc] = await db.insert(documents).values({
    name: file.name, seasonYear, minioKey, pageCount,
    uploadedById: session!.user!.id,
  }).returning();

  await ensureCollection();
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  const qdrantPoints = chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: {
      doc_id: doc.id, doc_name: doc.name, season_year: seasonYear,
      page_number: chunk.pageNumber, chunk_index: chunk.chunkIndex,
      minio_key: minioKey, content: chunk.text,
    },
  }));

  await upsertChunks(qdrantPoints);
  await db.insert(docChunks).values(chunks.map((chunk, i) => ({
    documentId: doc.id, chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber, content: chunk.text,
    qdrantPointId: qdrantPoints[i].id,
  })));

  return NextResponse.json({ ok: true, docId: doc.id, chunks: chunks.length, pageCount });
}
```

- [ ] **Step 2: Create app/api/admin/documents/route.ts**

```typescript
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { deletePdf } from "@/lib/minio";
import { deleteChunksByDocId } from "@/lib/qdrant";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const docs = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  return NextResponse.json(docs);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deletePdf(doc.minioKey);
  await deleteChunksByDocId(id);
  await db.delete(docChunks).where(eq(docChunks.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create components/admin/DocumentUploader.tsx**

```tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DocumentUploader({ onSuccess }: { onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [seasonYear, setSeasonYear] = useState(2026);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Only PDF files are supported."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("seasonYear", String(seasonYear));
      const res = await fetch("/api/admin/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Indexed ${data.chunks} chunks from ${data.pageCount} pages.`);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-[#2e2e2e] bg-[#1a1a1a] p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ED1C24]/10">
          <Upload size={22} className="text-[#ED1C24]" />
        </div>
        <div>
          <p className="font-medium text-white">Upload FRC Document</p>
          <p className="text-sm text-[#8A8A8A]">PDF only — game manuals, team updates, rule supplements</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value, 10))}
            className="rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] px-3 py-2 text-sm text-white"
          >
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="bg-[#ED1C24] text-white hover:bg-[#c9151b]"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Indexing..." : "Choose PDF"}
          </Button>
        </div>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create components/admin/DocumentList.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Doc { id: string; name: string; seasonYear: number; pageCount: number; uploadedAt: string; }

export function DocumentList({ refreshTrigger }: { refreshTrigger: number }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      setDocs((p) => p.filter((d) => d.id !== id));
      toast.success("Document removed.");
    } catch { toast.error("Failed to delete document."); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8A8A8A]" /></div>;
  if (!docs.length) return <p className="py-8 text-center text-sm text-[#8A8A8A]">No documents indexed yet.</p>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3">
          <FileText size={16} className="shrink-0 text-[#ED1C24]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{doc.name}</p>
            <p className="text-xs text-[#8A8A8A]">
              {doc.seasonYear} · {doc.pageCount} pages · {new Date(doc.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#ED1C24]"
            onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
          >
            {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create app/admin/documents/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentList } from "@/components/admin/DocumentList";
import { Shield } from "lucide-react";

export default function AdminDocumentsPage() {
  const [trigger, setTrigger] = useState(0);
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ED1C24]">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Document Management</h1>
            <p className="text-sm text-[#8A8A8A]">Index FRC PDFs for RAG-powered answers</p>
          </div>
        </div>
        <div className="space-y-6">
          <DocumentUploader onSuccess={() => setTrigger((n) => n + 1)} />
          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8A8A8A]">Indexed Documents</h2>
            <DocumentList refreshTrigger={trigger} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/admin/ app/api/admin/ components/admin/
git commit -m "feat: admin document management — upload, index, delete PDFs"
```

---

## Task 18: Legal Pages

**Files:**
- Create: `lib/markdown.ts`
- Create: `app/terms-of-service/page.tsx`
- Create: `app/privacy-policy/page.tsx`

- [ ] **Step 1: Create lib/markdown.ts**

```typescript
import fs from "fs/promises";
import path from "path";

export async function readPublicMarkdown(filename: string): Promise<string> {
  return fs.readFile(path.join(process.cwd(), "public", filename), "utf-8");
}
```

- [ ] **Step 2: Create app/terms-of-service/page.tsx**

```tsx
import { readPublicMarkdown } from "@/lib/markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Terms of Service — Curator" };

export default async function TermsPage() {
  const content = await readPublicMarkdown("terms-of-service.md");
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">← Back to Curator</a>
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create app/privacy-policy/page.tsx**

```tsx
import { readPublicMarkdown } from "@/lib/markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = { title: "Privacy Policy — Curator" };

export default async function PrivacyPage() {
  const content = await readPublicMarkdown("privacy-policy.md");
  return (
    <div className="min-h-screen bg-[#0f0f0f] px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="mb-8 inline-block text-sm text-[#0066B3] hover:underline">← Back to Curator</a>
        <article className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/markdown.ts app/terms-of-service/ app/privacy-policy/
git commit -m "feat: Terms of Service and Privacy Policy pages rendered from markdown"
```

---

## Task 19: TypeScript + Lint Fixes + First Run

- [ ] **Step 1: Check TypeScript**

```bash
cd /srv/md0/robotics/curator
npx tsc --noEmit 2>&1 | head -60
```

Common fixes needed:
- If `pdf-parse` has no types: add `// @ts-ignore` above the import in `lib/chunker.ts`
- If `next-auth` types conflict: ensure `types/next-auth.d.ts` exists
- If `@auth/drizzle-adapter` type errors: check it matches `next-auth@beta`

- [ ] **Step 2: Run ESLint**

```bash
npm run lint 2>&1 | head -40
```

Fix any errors. Common: unused imports, missing `key` props, `any` types.

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

Expected: compiles without errors on `http://localhost:3000`.

- [ ] **Step 4: Smoke test**

1. Open `http://localhost:3000` → TOS modal appears ✓
2. Accept TOS → input enabled ✓
3. Send message → response streams ✓
4. Send second message → auth modal appears ✓
5. Visit `/terms-of-service` → page renders ✓
6. Visit `/privacy-policy` → page renders ✓

- [ ] **Step 5: Configure Google OAuth**

In Google Cloud Console → APIs & Services → Credentials:
1. Create OAuth 2.0 Client ID (Web application)
2. Authorized JavaScript origins: `http://localhost:3000`
3. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID → `AUTH_GOOGLE_ID` in `.env.local`
5. Copy Client Secret → `AUTH_GOOGLE_SECRET` in `.env.local`
6. Restart dev server

- [ ] **Step 6: Test Google sign-in**

1. Click "Sign in with Google" in sidebar
2. Google OAuth flow completes → redirected to `/` ✓
3. Sidebar shows user name/avatar ✓
4. User appears in Postgres: `docker exec -it curator-postgres-1 psql -U curator -d curator -c "SELECT email FROM users;"`

- [ ] **Step 7: Test admin**

1. Visit `http://localhost:3000/admin/documents` ✓
2. Upload a PDF → success toast with chunk count ✓
3. Document appears in list ✓
4. Ask a question about the PDF content → response cites the document ✓

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete Curator rebuild — auth, RAG, web search, FIRST dark UI, admin"
```
