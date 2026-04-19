# Admin Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full admin panel (stats, user management, chat viewer, reports, structured document upload), add AI-generated chat titles with typewriter animation, add user sidebar resize, and match the clean card-based aesthetic of the chat UI throughout.

**Architecture:** Next.js app router — `app/admin/layout.tsx` wraps all admin pages in a shared sidebar shell. Each section is a server-rendered page backed by protected API routes under `/api/admin/*`. Two-tier admin: `ADMIN_EMAILS` env var (superadmin) OR `users.isAdmin` DB column. IP bans enforced in `middleware.ts` (all routes) and repeated in admin API routes. AI title generation fires after the first assistant response and streams the title character-by-character into the sidebar.

**Tech Stack:** Next.js 16 app router, Drizzle ORM + PostgreSQL, Qdrant, OpenRouter (title LLM), shadcn/ui + Radix UI, Tailwind CSS v4, framer-motion, Zustand, Sonner toasts

**Aesthetic rule:** Every admin surface uses `bg-background`/`bg-card`, `border-border/60`, `shadow-[var(--shadow-card)]`, `rounded-[1.75rem]`, `text-[13px]` for UI text, `#0066B3` accent. Dialogs use `bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)]`. No custom admin-only color palette.

---

## File Map

### New files
| Path | Purpose |
|------|---------|
| `app/admin/layout.tsx` | Admin shell — auth guard + sidebar |
| `app/admin/page.tsx` | Stats dashboard |
| `app/admin/users/page.tsx` | User management |
| `app/admin/chats/page.tsx` | Chat viewer |
| `app/admin/reports/page.tsx` | Reports queue |
| `components/admin/AdminSidebar.tsx` | Admin nav sidebar |
| `components/admin/ConfirmDialog.tsx` | Reusable confirmation popup |
| `components/admin/ChatViewerModal.tsx` | Read-only chat thread modal |
| `components/admin/ReportDetailModal.tsx` | Report action modal |
| `components/admin/DocumentUploadModal.tsx` | 3-step upload modal |
| `components/chat/ReportButton.tsx` | Flag icon + report dialog on messages |
| `app/api/admin/stats/route.ts` | GET stats |
| `app/api/admin/users/route.ts` | GET paginated user list |
| `app/api/admin/users/[id]/route.ts` | PATCH (admin/ban toggle) + DELETE user |
| `app/api/admin/chats/route.ts` | GET all conversations |
| `app/api/admin/chats/[id]/route.ts` | GET full message thread |
| `app/api/admin/reports/route.ts` | GET reports list |
| `app/api/admin/reports/[id]/route.ts` | PATCH report status |
| `app/api/reports/route.ts` | POST user submits a report |
| `app/api/conversations/[id]/title/route.ts` | POST trigger AI title generation |

### Modified files
| Path | Change |
|------|--------|
| `lib/db/schema.ts` | Add `isAdmin`, `ipBanned`, `bannedIp` to users; add `bannedIps`, `reports` tables; add `tags` to documents |
| `auth.ts` | Check DB `isAdmin` in JWT callback |
| `middleware.ts` | Add IP ban check before admin guard |
| `components/sidebar/Sidebar.tsx` | Drag-resize handle + update admin link to `/admin` |
| `components/chat/ChatWindow.tsx` | Call title API after first response, pass `onTitleGenerated` |
| `app/admin/documents/page.tsx` | Wire up new `DocumentUploadModal`, keep existing document list |
| `app/api/chat/route.ts` | No change needed — title generation triggered from client |

---

## Task 1: Update DB schema

**Files:**
- Modify: `lib/db/schema.ts`
- Run: `npm run db:generate && npm run db:migrate`

- [ ] **Step 1: Add new columns and tables to schema.ts**

Replace the `users` table definition and add new tables:

```ts
// lib/db/schema.ts
import {
  pgTable, text, timestamp, integer, jsonb, uuid, boolean, pgEnum,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  isAdmin: boolean("is_admin").notNull().default(false),
  ipBanned: boolean("ip_banned").notNull().default(false),
  bannedIp: text("banned_ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ... accounts, sessions, verificationTokens, conversations, messages unchanged ...

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  scope: text("scope", { enum: ["season", "general"] }).notNull().default("season"),
  seasonYear: integer("season_year"),
  minioKey: text("minio_key").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedById: text("uploaded_by_id").references(() => users.id),
});

// ... docChunks unchanged ...

export const bannedIps = pgTable("banned_ips", {
  ip: text("ip").primaryKey(),
  reason: text("reason"),
  bannedAt: timestamp("banned_at").defaultNow().notNull(),
  bannedById: text("banned_by_id").references(() => users.id),
});

export const reportStatusEnum = pgEnum("report_status", ["pending", "reviewed", "dismissed"]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  reportedById: text("reported_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: reportStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReportStatus = "pending" | "reviewed" | "dismissed";
```

- [ ] **Step 2: Generate and apply the migration**

```bash
npm run db:generate
npm run db:migrate
```

Expected: new migration file created in `lib/db/migrations/`, applied to DB with no errors.

- [ ] **Step 3: Verify schema applied**

```bash
npm run db:studio
```

Open Drizzle Studio, confirm `users` has `is_admin`, `ip_banned`, `banned_ip`; `documents` has `tags`; `banned_ips` and `reports` tables exist.

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "feat: add isAdmin, ipBanned, bannedIps, reports, document tags to schema"
```

---

## Task 2: Update auth to check DB isAdmin

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Update JWT callback to check DB**

```ts
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type GoogleProfile = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  email_verified?: boolean;
};

function isAdminEmail(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .includes((email ?? "").toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      profile(profile: GoogleProfile) {
        return {
          id: profile.sub,
          name: profile.name ?? null,
          email: profile.email?.toLowerCase() ?? null,
          image: profile.picture ?? null,
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) token.id = user.id;
      const email = user?.email ?? token.email;

      // Superadmin always wins — no DB check needed
      if (isAdminEmail(email)) {
        token.isAdmin = true;
        token.isSuperAdmin = true;
        return token;
      }

      // Check DB admin flag on sign-in or explicit update trigger
      if ((user || trigger === "update") && token.id) {
        const [row] = await db
          .select({ isAdmin: users.isAdmin })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        token.isAdmin = row?.isAdmin ?? false;
      }

      token.isSuperAdmin = false;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSuperAdmin = Boolean(token.isSuperAdmin);
      }
      return session;
    },
  },
  pages: { signIn: "/" },
});
```

- [ ] **Step 2: Update next-auth type extension**

```ts
// types/next-auth.d.ts
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      isSuperAdmin: boolean;
    };
  }
}
```

- [ ] **Step 3: Verify**

Start dev server (`npm run dev`), sign in as a non-superadmin user. In Drizzle Studio, set their `is_admin = true`. Sign out and back in — the session should now include `isAdmin: true`. Sign back in as superadmin email — `isSuperAdmin` should be true.

- [ ] **Step 4: Commit**

```bash
git add auth.ts types/next-auth.d.ts
git commit -m "feat: check DB isAdmin in JWT callback, add isSuperAdmin flag"
```

---

## Task 3: Update middleware for IP bans

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Rewrite middleware**

```ts
// middleware.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export default auth(async (req) => {
  const ip = getClientIp(req);

  if (ip !== "unknown") {
    const [ban] = await db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);

    if (ban) {
      return new NextResponse("Your access has been suspended.", { status: 403 });
    }
  }

  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  if (isAdminRoute) {
    const session = req.auth;
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)"],
};
```

- [ ] **Step 2: Create a shared admin auth helper**

```ts
// lib/admin-auth.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function requireAdmin(req: NextRequest): Promise<
  { ok: true; userId: string; isSuperAdmin: boolean } | { ok: false; response: NextResponse }
> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (ip !== "unknown") {
    const [ban] = await db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);
    if (ban) {
      return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
  }

  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, userId: session.user.id, isSuperAdmin: session.user.isSuperAdmin ?? false };
}

export async function requireAuth(req: NextRequest): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, userId: session.user.id };
}
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts lib/admin-auth.ts
git commit -m "feat: middleware IP ban enforcement, shared requireAdmin helper"
```

---

## Task 4: Admin layout shell and sidebar

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Create AdminSidebar**

```tsx
// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, MessageSquare, Shield, Users, Flag, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const NAV = [
  { href: "/admin", label: "Stats", icon: BarChart3, exact: true },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/chats", label: "Chats", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
];

export function AdminSidebar({ pendingReports }: { pendingReports?: number }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-svh w-56 shrink-0 flex-col border-r border-border/60 bg-card">
      {/* Header */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0066B3]/10 text-[#0066B3]">
          <Shield className="size-4" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">Admin</span>
        {session?.user?.isSuperAdmin && (
          <span className="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            super
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-[#0066B3]/10 text-[#0066B3]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              {item.label === "Reports" && pendingReports && pendingReports > 0 ? (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {pendingReports > 99 ? "99+" : pendingReports}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border/60 p-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to chat
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create admin layout**

```tsx
// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const [{ count }] = await db
    .select({ count: reports.id })
    .from(reports)
    .where(eq(reports.status, "pending"))
    .then((rows) => [{ count: rows.length }]);

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminSidebar pendingReports={count} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

`npm run dev`, navigate to `/admin` — should show the sidebar and redirect to `/` if not signed in as admin.

- [ ] **Step 4: Commit**

```bash
git add app/admin/layout.tsx components/admin/AdminSidebar.tsx
git commit -m "feat: admin layout shell with sidebar nav and pending reports badge"
```

---

## Task 5: Stats API

**Files:**
- Create: `app/api/admin/stats/route.ts`

- [ ] **Step 1: Write the stats API**

```ts
// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, conversations, messages, documents, docChunks, reports } from "@/lib/db/schema";
import { eq, gte, count, sum, sql } from "drizzle-orm";
import { qdrant } from "@/lib/qdrant";

const COLLECTION = process.env.QDRANT_COLLECTION ?? "curator-docs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    [totalUsers],
    [newUsers7d],
    [newUsers30d],
    [totalConversations],
    [activeToday],
    [totalMessages],
    [messages7d],
    topUsers,
    [pendingReports],
    [totalDocs],
    docStats,
    [totalChunks],
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(conversations),
    db.select({ count: count() }).from(conversations).where(gte(conversations.updatedAt, todayStart)),
    db.select({ count: count() }).from(messages),
    db.select({ count: count() }).from(messages).where(gte(messages.createdAt, sevenDaysAgo)),
    db
      .select({
        userId: messages.conversationId,
        name: users.name,
        email: users.email,
        msgCount: count(),
      })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .innerJoin(users, eq(conversations.userId, users.id))
      .groupBy(conversations.userId, users.name, users.email)
      .orderBy(sql`count(*) desc`)
      .limit(5),
    db.select({ count: count() }).from(reports).where(eq(reports.status, "pending")),
    db.select({ count: count() }).from(documents),
    db
      .select({
        scope: documents.scope,
        docCount: count(),
        totalPages: sum(documents.pageCount),
      })
      .from(documents)
      .groupBy(documents.scope),
    db.select({ count: count() }).from(docChunks),
  ]);

  let qdrantCount = 0;
  try {
    const info = await qdrant.getCollection(COLLECTION);
    qdrantCount = info.points_count ?? 0;
  } catch {
    // Qdrant unavailable — not fatal
  }

  return NextResponse.json({
    usage: {
      totalUsers: totalUsers.count,
      newUsers7d: newUsers7d.count,
      newUsers30d: newUsers30d.count,
      totalConversations: totalConversations.count,
      activeToday: activeToday.count,
      totalMessages: totalMessages.count,
      messages7d: messages7d.count,
      topUsers,
      pendingReports: pendingReports.count,
    },
    content: {
      totalDocuments: totalDocs.count,
      totalChunks: totalChunks.count,
      qdrantVectors: qdrantCount,
      byScope: docStats,
    },
  });
}
```

- [ ] **Step 2: Verify**

```bash
curl -b <session-cookie> http://localhost:3000/api/admin/stats
```

Expected: JSON with `usage` and `content` objects, all numeric values.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/stats/route.ts
git commit -m "feat: admin stats API — usage and content metrics"
```

---

## Task 6: Stats dashboard page

**Files:**
- Create: `app/admin/page.tsx`

- [ ] **Step 1: Write the stats page**

```tsx
// app/admin/page.tsx
import { BarChart3, FileText, Hash, MessageSquare, Users, Zap, Flag, TrendingUp } from "lucide-react";

async function getStats() {
  // Server-side fetch using absolute URL from env or relative in Edge
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/admin/stats`, {
    cache: "no-store",
    headers: { Cookie: "" }, // replaced by auth() in the API route
  });
  // NOTE: In Next.js app router, server components calling internal APIs
  // should use the DB directly. Refactor if perf is a concern.
  return res.json();
}
```

**Implementation note:** Because this is a server component inside the same process, call the DB directly instead of fetching the API route. Replace the above with:

```tsx
// app/admin/page.tsx
import { db } from "@/lib/db";
import { users, conversations, messages, documents, docChunks, reports } from "@/lib/db/schema";
import { eq, gte, count, sum, sql } from "drizzle-orm";
import { qdrant } from "@/lib/qdrant";
import { BarChart3, FileText, Hash, MessageSquare, Users, Zap, Flag } from "lucide-react";

const COLLECTION = process.env.QDRANT_COLLECTION ?? "curator-docs";

async function fetchStats() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [[tu], [nu7], [nu30], [tc], [at], [tm], [m7], top, [pr], [td], ds, [tch]] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
      db.select({ count: count() }).from(conversations),
      db.select({ count: count() }).from(conversations).where(gte(conversations.updatedAt, todayStart)),
      db.select({ count: count() }).from(messages),
      db.select({ count: count() }).from(messages).where(gte(messages.createdAt, sevenDaysAgo)),
      db
        .select({ name: users.name, email: users.email, msgCount: count() })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .innerJoin(users, eq(conversations.userId, users.id))
        .groupBy(users.id, users.name, users.email)
        .orderBy(sql`count(*) desc`)
        .limit(5),
      db.select({ count: count() }).from(reports).where(eq(reports.status, "pending")),
      db.select({ count: count() }).from(documents),
      db.select({ scope: documents.scope, docCount: count(), totalPages: sum(documents.pageCount) }).from(documents).groupBy(documents.scope),
      db.select({ count: count() }).from(docChunks),
    ]);

  let qdrantCount = 0;
  try {
    const info = await qdrant.getCollection(COLLECTION);
    qdrantCount = info.points_count ?? 0;
  } catch { /* not fatal */ }

  return { tu, nu7, nu30, tc, at, tm, m7, top, pr, td, ds, tch, qdrantCount };
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: number | string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default async function AdminStatsPage() {
  const s = await fetchStats();

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Live metrics from the database and retrieval index.</p>
        </div>

        {s.pr.count > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <Flag className="size-4 text-red-500" />
            <p className="text-[13px] text-red-600 dark:text-red-400">
              <span className="font-semibold">{s.pr.count}</span> pending report{s.pr.count !== 1 ? "s" : ""} need review.
            </p>
            <a href="/admin/reports" className="ml-auto text-[13px] font-medium text-red-500 underline-offset-2 hover:underline">
              Review →
            </a>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Usage</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={s.tu.count} sub={`+${s.nu7.count} last 7d · +${s.nu30.count} last 30d`} icon={Users} />
            <StatCard label="Conversations" value={s.tc.count} sub={`${s.at.count} active today`} icon={MessageSquare} />
            <StatCard label="Messages" value={s.tm.count} sub={`${s.m7.count} last 7 days`} icon={Zap} />
            <StatCard label="Pending reports" value={s.pr.count} icon={Flag} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Top users</h2>
          <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            {s.top.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">No messages yet.</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {s.top.map((u, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-3 text-foreground">{u.name ?? u.email}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{u.msgCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">Content</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Documents" value={s.td.count} icon={FileText} />
            <StatCard label="Chunks" value={s.tch.count} icon={Hash} />
            <StatCard label="Qdrant vectors" value={s.qdrantCount} icon={BarChart3} />
            {s.ds.map((row) => (
              <StatCard
                key={row.scope}
                label={row.scope === "season" ? "Season docs" : "General docs"}
                value={row.docCount}
                sub={`${row.totalPages ?? 0} pages`}
                icon={FileText}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `http://localhost:3000/admin` — stat cards with real numbers, pending reports alert if any.

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat: admin stats dashboard page"
```

---

## Task 7: User management API

**Files:**
- Create: `app/api/admin/users/route.ts`
- Create: `app/api/admin/users/[id]/route.ts`

- [ ] **Step 1: Write GET /api/admin/users**

```ts
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, messages, conversations } from "@/lib/db/schema";
import { eq, count, ilike, or, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const search = req.nextUrl.searchParams.get("q") ?? "";
  const filter = req.nextUrl.searchParams.get("filter") ?? "all"; // all | admin | banned

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      isAdmin: users.isAdmin,
      ipBanned: users.ipBanned,
      bannedIp: users.bannedIp,
      createdAt: users.createdAt,
      msgCount: count(messages.id),
    })
    .from(users)
    .leftJoin(conversations, eq(conversations.userId, users.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      search
        ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
        : undefined
    )
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  const filtered = rows.filter((u) => {
    if (filter === "admin") return u.isAdmin;
    if (filter === "banned") return u.ipBanned;
    return true;
  });

  return NextResponse.json(filtered);
}
```

- [ ] **Step 2: Write PATCH and DELETE /api/admin/users/[id]**

```ts
// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json() as {
    action: "promote" | "demote" | "ban" | "unban";
    reason?: string;
    ip?: string;
  };

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Superadmins cannot be modified from the UI — checked via ADMIN_EMAILS
  const superAdminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  if (target.email && superAdminEmails.includes(target.email.toLowerCase())) {
    return NextResponse.json({ error: "Cannot modify a superadmin" }, { status: 403 });
  }

  switch (body.action) {
    case "promote":
      await db.update(users).set({ isAdmin: true }).where(eq(users.id, id));
      break;
    case "demote":
      if (!auth.isSuperAdmin) return NextResponse.json({ error: "Only superadmins can demote admins" }, { status: 403 });
      await db.update(users).set({ isAdmin: false }).where(eq(users.id, id));
      break;
    case "ban": {
      const ip = body.ip ?? target.bannedIp ?? "unknown";
      await db.update(users).set({ ipBanned: true, bannedIp: ip }).where(eq(users.id, id));
      if (ip !== "unknown") {
        await db.insert(bannedIps).values({ ip, reason: body.reason ?? null, bannedById: auth.userId }).onConflictDoNothing();
      }
      break;
    }
    case "unban":
      if (target.bannedIp) {
        await db.delete(bannedIps).where(eq(bannedIps.ip, target.bannedIp));
      }
      await db.update(users).set({ ipBanned: false, bannedIp: null }).where(eq(users.id, id));
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const superAdminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  const [target] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.email && superAdminEmails.includes(target.email.toLowerCase())) {
    return NextResponse.json({ error: "Cannot delete a superadmin" }, { status: 403 });
  }

  await db.delete(users).where(eq(users.id, id)); // cascades via FK
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/users/route.ts app/api/admin/users/[id]/route.ts
git commit -m "feat: admin users API — list, promote/demote, ban/unban, delete"
```

---

## Task 8: User management page

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `components/admin/ConfirmDialog.tsx`

- [ ] **Step 1: Create reusable ConfirmDialog**

```tsx
// components/admin/ConfirmDialog.tsx
"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = "Confirm", destructive, loading, onConfirm, onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="rounded-[1.75rem] border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="rounded-xl">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl ${destructive ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
          >
            {loading ? "..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create the users page**

```tsx
// app/admin/users/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Shield, ShieldOff, Ban, Trash2, MessageSquare, LockOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isAdmin: boolean;
  ipBanned: boolean;
  bannedIp: string | null;
  createdAt: string;
  msgCount: number;
}

type DialogState =
  | { type: "promote" | "demote" | "delete" | "unban"; user: User }
  | { type: "ban"; user: User; ip: string; reason: string }
  | null;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "admin" | "banned">("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [loading, setLoading] = useState(false);
  const [banIp, setBanIp] = useState("");
  const [banReason, setBanReason] = useState("");

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filter !== "all") params.set("filter", filter);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data);
  }, [search, filter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!dialog) return;
    setLoading(true);
    try {
      if (dialog.type === "delete") {
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success("User deleted");
      } else {
        const body: Record<string, unknown> = { action: dialog.type };
        if (dialog.type === "ban") { body.ip = banIp; body.reason = banReason; }
        const res = await fetch(`/api/admin/users/${dialog.user.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        toast.success(`User ${dialog.type}d`);
      }
      setDialog(null);
      setBanIp("");
      setBanReason("");
      void fetchUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{users.length} total</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 rounded-xl pl-8 text-[13px]"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {(["all", "admin", "banned"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-1.5 text-[13px] transition-colors ${filter === f ? "bg-[#0066B3]/10 text-[#0066B3]" : "text-muted-foreground hover:bg-muted"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
          {users.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">No users found.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Joined</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Messages</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/40 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-6 w-6 shrink-0 rounded-full bg-muted" />
                        <div>
                          <p className="font-medium text-foreground">{u.name ?? "—"}</p>
                          <p className="text-muted-foreground">{u.email}</p>
                        </div>
                        {u.isAdmin && (
                          <span className="rounded-full bg-[#0066B3]/10 px-2 py-0.5 text-[10px] font-semibold text-[#0066B3]">Admin</span>
                        )}
                        {u.ipBanned && (
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">Banned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{u.msgCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/chats?userId=${u.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="View chats">
                            <MessageSquare className="size-3.5" />
                          </Button>
                        </Link>
                        {u.isAdmin ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Revoke admin"
                            onClick={() => setDialog({ type: "demote", user: u })}>
                            <ShieldOff className="size-3.5" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Promote to admin"
                            onClick={() => setDialog({ type: "promote", user: u })}>
                            <Shield className="size-3.5" />
                          </Button>
                        )}
                        {u.ipBanned ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="Unban"
                            onClick={() => setDialog({ type: "unban", user: u })}>
                            <LockOpen className="size-3.5 text-red-500" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" title="IP ban"
                            onClick={() => { setBanIp(u.bannedIp ?? ""); setBanReason(""); setDialog({ type: "ban", user: u, ip: "", reason: "" }); }}>
                            <Ban className="size-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-red-500 hover:text-red-600" title="Delete user"
                          onClick={() => setDialog({ type: "delete", user: u })}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Ban dialog — needs IP + reason inputs */}
      {dialog?.type === "ban" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-border/60 bg-card/95 p-6 shadow-[var(--shadow-float)]">
            <h2 className="text-base font-semibold text-foreground">Ban {dialog.user.name ?? dialog.user.email}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">Enter the IP address to ban and an optional reason.</p>
            <div className="mt-4 space-y-3">
              <Input placeholder="IP address (e.g. 1.2.3.4)" value={banIp} onChange={(e) => setBanIp(e.target.value)} className="rounded-xl text-[13px]" />
              <Input placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="rounded-xl text-[13px]" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setDialog(null)}>Cancel</Button>
              <Button size="sm" className="rounded-xl bg-red-500 text-white hover:bg-red-600" disabled={loading || !banIp} onClick={handleAction}>
                {loading ? "Banning..." : "Ban user"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!dialog && dialog.type !== "ban"}
        title={
          dialog?.type === "delete" ? `Delete ${dialog?.user.name ?? dialog?.user.email}?` :
          dialog?.type === "promote" ? "Promote to admin?" :
          dialog?.type === "demote" ? "Revoke admin?" :
          dialog?.type === "unban" ? "Unban user?" : ""
        }
        description={
          dialog?.type === "delete" ? "This permanently deletes all their conversations and messages. Cannot be undone." :
          dialog?.type === "promote" ? "This grants admin access. They will see all admin pages on next login." :
          dialog?.type === "demote" ? "This removes admin access. Takes effect on their next login." :
          dialog?.type === "unban" ? "This removes the IP ban and allows them to access the app again." : ""
        }
        confirmLabel={dialog?.type === "delete" ? "Delete" : dialog?.type === "unban" ? "Unban" : "Confirm"}
        destructive={dialog?.type === "delete"}
        loading={loading}
        onConfirm={handleAction}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/users/page.tsx components/admin/ConfirmDialog.tsx
git commit -m "feat: admin users page with promote, ban, delete actions"
```

---

## Task 9: Chat viewer API

**Files:**
- Create: `app/api/admin/chats/route.ts`
- Create: `app/api/admin/chats/[id]/route.ts`

- [ ] **Step 1: Write GET /api/admin/chats**

```ts
// app/api/admin/chats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, users, messages, reports } from "@/lib/db/schema";
import { eq, desc, count, ilike, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("q") ?? "";

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      seasonYear: conversations.seasonYear,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      userId: conversations.userId,
      userName: users.name,
      userEmail: users.email,
      msgCount: count(messages.id),
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        userId ? eq(conversations.userId, userId) : undefined,
        search ? ilike(conversations.title, `%${search}%`) : undefined,
      )
    )
    .groupBy(conversations.id, users.name, users.email, users.id)
    .orderBy(desc(conversations.updatedAt))
    .limit(200);

  // Attach pending report flag per conversation
  const pendingReportConvIds = new Set(
    (await db
      .select({ conversationId: reports.conversationId })
      .from(reports)
      .where(eq(reports.status, "pending"))
    ).map((r) => r.conversationId)
  );

  return NextResponse.json(
    rows.map((r) => ({ ...r, hasPendingReport: pendingReportConvIds.has(r.id) }))
  );
}
```

- [ ] **Step 2: Write GET /api/admin/chats/[id]**

```ts
// app/api/admin/chats/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const [conv] = await db
    .select({ id: conversations.id, title: conversations.title, userId: conversations.userId, userName: users.name, userEmail: users.email })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ ...conv, messages: msgs });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/chats/route.ts app/api/admin/chats/[id]/route.ts
git commit -m "feat: admin chats API — list and full thread view"
```

---

## Task 10: Chat viewer page and modal

**Files:**
- Create: `app/admin/chats/page.tsx`
- Create: `components/admin/ChatViewerModal.tsx`

- [ ] **Step 1: Create ChatViewerModal**

```tsx
// components/admin/ChatViewerModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface Props {
  conversationId: string | null;
  onClose: () => void;
}

export function ChatViewerModal({ conversationId, onClose }: Props) {
  const [data, setData] = useState<{ title: string; userName: string | null; userEmail: string; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/admin/chats/${conversationId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [conversationId]);

  return (
    <Dialog open={!!conversationId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold">{data?.title ?? "Loading..."}</DialogTitle>
          {data && (
            <p className="text-[12px] text-muted-foreground">{data.userName ?? data.userEmail}</p>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-center text-[13px] text-muted-foreground py-8">Loading...</p>}
          {data?.messages.map((m) => (
            <div key={m.id} className={cn("mb-4 flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px]",
                m.role === "user"
                  ? "bg-[#0066B3] text-white"
                  : "bg-muted text-foreground"
              )}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create chats page**

```tsx
// app/admin/chats/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChatViewerModal } from "@/components/admin/ChatViewerModal";

interface ConvRow {
  id: string;
  title: string;
  seasonYear: number;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string;
  msgCount: number;
  hasPendingReport: boolean;
}

export default function AdminChatsPage() {
  const searchParams = useSearchParams();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const fetchConvs = useCallback(async () => {
    const params = new URLSearchParams();
    const userId = searchParams.get("userId");
    if (userId) params.set("userId", userId);
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/chats?${params}`);
    setConvs(await res.json());
  }, [search, searchParams]);

  useEffect(() => { void fetchConvs(); }, [fetchConvs]);

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chats</h1>
          {searchParams.get("userId") && (
            <p className="mt-1 text-[13px] text-muted-foreground">Filtered by user</p>
          )}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 rounded-xl pl-8 text-[13px]" placeholder="Search titles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
          {convs.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">No conversations found.</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Season</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Msgs</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {convs.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors"
                    onClick={() => setOpenId(c.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{c.title}</span>
                        {c.hasPendingReport && <Flag className="size-3.5 text-red-500" />}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.userName ?? c.userEmail}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.seasonYear}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{c.msgCount}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{new Date(c.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ChatViewerModal conversationId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/chats/page.tsx components/admin/ChatViewerModal.tsx
git commit -m "feat: admin chat viewer page and read-only modal"
```

---

## Task 11: Reports API

**Files:**
- Create: `app/api/admin/reports/route.ts`
- Create: `app/api/admin/reports/[id]/route.ts`
- Create: `app/api/reports/route.ts`

- [ ] **Step 1: Admin reports list**

```ts
// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, conversations, users, messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rows = await db
    .select({
      id: reports.id,
      status: reports.status,
      reason: reports.reason,
      createdAt: reports.createdAt,
      conversationId: reports.conversationId,
      conversationTitle: conversations.title,
      messageId: reports.messageId,
      reporterName: users.name,
      reporterEmail: users.email,
    })
    .from(reports)
    .innerJoin(conversations, eq(reports.conversationId, conversations.id))
    .innerJoin(users, eq(reports.reportedById, users.id))
    .orderBy(desc(reports.createdAt))
    .limit(200);

  return NextResponse.json(rows);
}
```

- [ ] **Step 2: Admin report update**

```ts
// app/api/admin/reports/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { action } = await req.json() as { action: "dismiss" | "delete_message" | "reviewed" };

  const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "dismiss") {
    await db.update(reports).set({ status: "dismissed" }).where(eq(reports.id, id));
  } else if (action === "delete_message") {
    await db.delete(messages).where(eq(messages.id, report.messageId));
    await db.update(reports).set({ status: "reviewed" }).where(eq(reports.id, id));
  } else if (action === "reviewed") {
    await db.update(reports).set({ status: "reviewed" }).where(eq(reports.id, id));
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: User-facing report submission**

```ts
// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, messages, conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { messageId, reason } = await req.json() as { messageId: string; reason: string };
  if (!messageId || !reason?.trim()) {
    return NextResponse.json({ error: "messageId and reason are required" }, { status: 400 });
  }

  const [msg] = await db
    .select({ id: messages.id, conversationId: messages.conversationId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // One report per user per message
  const [existing] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.messageId, messageId), eq(reports.reportedById, auth.userId)))
    .limit(1);
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409 });

  await db.insert(reports).values({
    conversationId: msg.conversationId,
    messageId,
    reportedById: auth.userId,
    reason: reason.trim(),
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/admin/reports/route.ts app/api/admin/reports/[id]/route.ts app/api/reports/route.ts
git commit -m "feat: reports APIs — admin list/update and user report submission"
```

---

## Task 12: Reports admin page

**Files:**
- Create: `app/admin/reports/page.tsx`
- Create: `components/admin/ReportDetailModal.tsx`

- [ ] **Step 1: Create ReportDetailModal**

```tsx
// components/admin/ReportDetailModal.tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  conversationId: string;
  messageId: string;
  reason: string;
  status: string;
  reporterEmail: string;
  conversationTitle: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  report: ReportRow | null;
  onClose: () => void;
  onAction: () => void;
  onViewChat: (conversationId: string) => void;
}

export function ReportDetailModal({ report, onClose, onAction, onViewChat }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!report) { setMessages([]); return; }
    setLoading(true);
    fetch(`/api/admin/chats/${report.conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        const all: Message[] = data.messages ?? [];
        const idx = all.findIndex((m) => m.id === report.messageId);
        const context = idx >= 0 ? all.slice(Math.max(0, idx - 3), idx + 1) : all.slice(-4);
        setMessages(context);
      })
      .finally(() => setLoading(false));
  }, [report]);

  const act = async (action: "dismiss" | "delete_message" | "reviewed") => {
    if (!report) return;
    setActing(true);
    try {
      const res = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(action === "dismiss" ? "Dismissed" : action === "delete_message" ? "Message deleted" : "Marked reviewed");
      onAction();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-sm font-semibold">Reported message</DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            From <span className="text-foreground">{report?.reporterEmail}</span> · Reason: {report?.reason}
          </p>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && <p className="text-center text-[13px] text-muted-foreground">Loading context...</p>}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px]",
                m.id === report?.messageId ? "ring-2 ring-red-500/60" : "",
                m.role === "user" ? "bg-[#0066B3] text-white" : "bg-muted text-foreground"
              )}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border/60 px-6 py-4">
          <Button variant="outline" size="sm" className="rounded-xl text-[13px]" onClick={() => onViewChat(report!.conversationId)}>
            View full chat
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-[13px]" disabled={acting} onClick={() => act("dismiss")}>
            Dismiss
          </Button>
          <Button size="sm" className="rounded-xl bg-red-500 text-white text-[13px] hover:bg-red-600" disabled={acting} onClick={() => act("delete_message")}>
            Delete message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create reports page**

```tsx
// app/admin/reports/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { ReportDetailModal } from "@/components/admin/ReportDetailModal";
import { ChatViewerModal } from "@/components/admin/ChatViewerModal";
import { cn } from "@/lib/utils";

interface ReportRow {
  id: string;
  conversationId: string;
  messageId: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  reporterEmail: string;
  reporterName: string | null;
  conversationTitle: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-red-500/10 text-red-500",
  reviewed: "bg-green-500/10 text-green-600 dark:text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/admin/reports");
    setReports(await res.json());
  }, []);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {reports.filter((r) => r.status === "pending").length} pending
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Flag className="size-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No reports yet.</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Conversation</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Reason</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40"
                    onClick={() => setSelected(r)}
                  >
                    <td className="px-5 py-3 text-muted-foreground">{r.reporterName ?? r.reporterEmail}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{r.conversationTitle}</td>
                    <td className="max-w-[200px] truncate px-5 py-3 text-muted-foreground">{r.reason}</td>
                    <td className="px-5 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLES[r.status])}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ReportDetailModal
        report={selected}
        onClose={() => setSelected(null)}
        onAction={fetchReports}
        onViewChat={(id) => { setSelected(null); setChatId(id); }}
      />
      <ChatViewerModal conversationId={chatId} onClose={() => setChatId(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/reports/page.tsx components/admin/ReportDetailModal.tsx
git commit -m "feat: admin reports page with context viewer and action buttons"
```

---

## Task 13: User-facing report button

**Files:**
- Create: `components/chat/ReportButton.tsx`
- Modify: `components/chat/ChatWindow.tsx` (or `MessageBubble.tsx` — wherever messages are rendered)

- [ ] **Step 1: Find where messages are rendered**

```bash
grep -n "MessageBubble\|message.content\|role.*assistant" components/chat/ChatWindow.tsx | head -20
```

Read `components/chat/MessageBubble.tsx` to understand its props.

- [ ] **Step 2: Create ReportButton**

```tsx
// components/chat/ReportButton.tsx
"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ReportButton({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reason: reason.trim() }),
      });
      if (res.status === 409) { toast.info("Already reported"); setOpen(false); return; }
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Report submitted");
      setOpen(false);
      setReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        title="Report this response"
      >
        <Flag className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[1.75rem] border border-border/60 bg-card/95 backdrop-blur-xl shadow-[var(--shadow-float)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Report response</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="What's wrong with this response?"
            className="min-h-[100px] rounded-xl text-[13px] resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-xl" disabled={loading || !reason.trim()} onClick={submit}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 3: Add report button to assistant messages**

Read `components/chat/MessageBubble.tsx` (or wherever assistant messages are rendered). Add `<ReportButton messageId={message.id} />` inside a `group` wrapper div on each assistant message. Example:

```tsx
// In the assistant message wrapper, add `group` class:
<div className="group flex items-start gap-2 ...">
  {/* existing message bubble */}
  {message.role === "assistant" && message.id && (
    <ReportButton messageId={message.id} />
  )}
</div>
```

The `group-hover:opacity-100` class on the button ensures it's hidden until the row is hovered.

- [ ] **Step 4: Commit**

```bash
git add components/chat/ReportButton.tsx
git commit -m "feat: user-facing report button on assistant messages"
```

---

## Task 14: AI chat title generation

**Files:**
- Create: `app/api/conversations/[id]/title/route.ts`
- Modify: `lib/store.ts` (add `setConversationTitle` for typewriter)
- Modify: `components/chat/ChatWindow.tsx` (call title API after first response)
- Modify: `components/sidebar/Sidebar.tsx` (typewriter animation on title)

- [ ] **Step 1: Create the title API**

```ts
// app/api/conversations/[id]/title/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const TITLE_MODEL = process.env.OPENROUTER_TITLE_MODEL ?? "openai/gpt-4o-mini";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const [conv] = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv || conv.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(4);

  if (msgs.length < 2) return NextResponse.json({ title: null });

  const context = msgs
    .filter((m) => m.role !== "system")
    .slice(0, 3)
    .map((m) => `${m.role}: ${m.content.slice(0, 400)}`)
    .join("\n");

  try {
    const res = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [
          {
            role: "system",
            content: "Generate a concise 3-6 word title for this conversation. Return ONLY the title, no quotes, no punctuation at end.",
          },
          { role: "user", content: context },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return NextResponse.json({ title: null });

    const data = await res.json();
    const title = (data.choices?.[0]?.message?.content as string | undefined)?.trim();
    if (!title) return NextResponse.json({ title: null });

    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null });
  }
}
```

- [ ] **Step 2: Add typewriter state to store**

In `lib/store.ts`, add to the `ChatStore` interface and implementation:

```ts
// Add to interface:
typingTitleConversationId: string | null;
typingTitle: string;
setTypingTitle: (conversationId: string, title: string) => void;
clearTypingTitle: () => void;

// Add to initial state:
typingTitleConversationId: null,
typingTitle: "",

// Add to implementation:
setTypingTitle: (conversationId, title) =>
  set({ typingTitleConversationId: conversationId, typingTitle: title }),
clearTypingTitle: () =>
  set({ typingTitleConversationId: null, typingTitle: "" }),
```

- [ ] **Step 3: Trigger title generation from ChatWindow**

In `components/chat/ChatWindow.tsx`, after `finalizeStreamingMessage` is called, check if this is the first assistant message in the conversation and trigger the title API:

```tsx
// After finalizeStreamingMessage call, inside the streaming completion handler:
const conv = useChatStore.getState().activeConversation();
const isFirstResponse = conv && conv.messages.filter((m) => m.role === "assistant").length === 1;

if (isFirstResponse && conv && conv.title === "New Chat") {
  // Fire and forget — no await
  void (async () => {
    const { setTypingTitle, updateConversation } = useChatStore.getState();
    try {
      const res = await fetch(`/api/conversations/${conv.id}/title`, { method: "POST" });
      const { title } = await res.json() as { title: string | null };
      if (!title) return;
      // Typewriter: reveal characters one by one
      setTypingTitle(conv.id, "");
      for (let i = 0; i <= title.length; i++) {
        await new Promise((r) => setTimeout(r, 35));
        setTypingTitle(conv.id, title.slice(0, i));
      }
      updateConversation(conv.id, { title });
      useChatStore.getState().clearTypingTitle();
    } catch { /* title gen failed — keep "New Chat" */ }
  })();
}
```

- [ ] **Step 4: Show typing title in sidebar**

In `components/sidebar/Sidebar.tsx` (inside `ConversationItem` or wherever the title is rendered):

```tsx
const { typingTitleConversationId, typingTitle } = useChatStore();
const displayTitle = conv.id === typingTitleConversationId ? typingTitle : conv.title;
```

Add a blinking cursor after `displayTitle` when `conv.id === typingTitleConversationId`:

```tsx
<span>
  {displayTitle}
  {conv.id === typingTitleConversationId && (
    <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-current" />
  )}
</span>
```

- [ ] **Step 5: Commit**

```bash
git add app/api/conversations/[id]/title/route.ts lib/store.ts
git commit -m "feat: AI chat title generation with typewriter animation"
```

---

## Task 15: Document upload modal (3-step)

**Files:**
- Create: `components/admin/DocumentUploadModal.tsx`
- Modify: `app/admin/documents/page.tsx` (replace inline uploader with modal trigger button)

- [ ] **Step 1: Create DocumentUploadModal**

```tsx
// components/admin/DocumentUploadModal.tsx
"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, ChevronRight, ChevronLeft, Sparkles, Check } from "lucide-react";
import { getDefaultSeasonYear, getSeasonYears } from "@/lib/seasons";
import type { DocumentScope } from "@/lib/db/schema";
import { toast } from "sonner";

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentUploadModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<DocumentScope>("season");
  const [seasonYear, setSeasonYear] = useState(getDefaultSeasonYear);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<"idle" | "uploading" | "indexing" | "done">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const seasons = getSeasonYears();

  const resetAll = () => {
    setStep(1); setFile(null); setName(""); setScope("season");
    setSeasonYear(getDefaultSeasonYear()); setDescription(""); setTags("");
    setProgress("idle");
  };

  const handleClose = () => { resetAll(); onClose(); };

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") { toast.error("PDF only"); return; }
    if (f.size > MAX_PDF_SIZE_BYTES) { toast.error("Max 250 MB"); return; }
    setFile(f);
    setName(f.name.replace(/\.pdf$/i, ""));
  };

  const generateDescription = async () => {
    // Reuse existing describe endpoint — requires document to exist first.
    // For pre-upload: use a temporary summarization call.
    // For now: show a placeholder toast and let user fill manually.
    toast.info("AI description available after upload. Fill manually or generate after indexing.");
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("scope", scope);
      fd.append("name", name.trim() || file.name.replace(/\.pdf$/i, ""));
      if (description.trim()) fd.append("description", description.trim());
      if (tags.trim()) fd.append("tags", JSON.stringify(tags.split(",").map((t) => t.trim()).filter(Boolean)));
      if (scope === "season") fd.append("seasonYear", String(seasonYear));

      setProgress("indexing");
      const res = await fetch("/api/admin/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setProgress("done");
      toast.success(`Indexed ${data.chunks} chunks from ${data.pageCount} pages.`);
      setTimeout(() => { handleClose(); onSuccess(); }, 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setProgress("idle");
    } finally {
      setUploading(false);
    }
  };

  const estimatedChunks = file ? Math.ceil((file.size / 1024 / 1024) * 8) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-lg rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold">Upload document</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                s < step ? "bg-[#0066B3] text-white" : s === step ? "bg-[#0066B3]/20 text-[#0066B3]" : "bg-muted text-muted-foreground"
              }`}>
                {s < step ? <Check className="size-3" /> : s}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* Step 1: File */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">Choose a PDF to upload to the retrieval library.</p>
              <div
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-background px-4 py-10 transition-colors hover:border-[#0066B3]/40 hover:bg-[#0066B3]/5"
                onClick={() => inputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="size-8 text-muted-foreground" />
                {file ? (
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">{file.name}</p>
                    <p className="text-[12px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">Drop PDF here or click to browse</p>
                )}
              </div>
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Step 2: Metadata */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Scope</label>
                <div className="flex gap-2">
                  {(["season", "general"] as DocumentScope[]).map((s) => (
                    <button key={s} onClick={() => setScope(s)} className={`rounded-xl px-3 py-1.5 text-[13px] transition-colors ${scope === s ? "bg-[#0066B3]/10 text-[#0066B3]" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {scope === "season" && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Season year</label>
                  <select value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-[13px] text-foreground">
                    {seasons.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Description (optional)</label>
                </div>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this document cover?" className="min-h-[80px] resize-none rounded-xl text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Tags (optional, comma-separated)</label>
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="rules, 2026, field" className="rounded-xl text-[13px]" />
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-background p-4 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium text-foreground">{name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><span className="font-medium text-foreground">{scope === "season" ? `Season ${seasonYear}` : "General"}</span></div>
                {description && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Description</span><span className="text-foreground text-right">{description}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Est. chunks</span><span className="font-medium text-foreground">~{estimatedChunks}</span></div>
              </div>
              {progress !== "idle" && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full bg-[#0066B3] transition-all duration-500 ${progress === "uploading" ? "w-1/3" : progress === "indexing" ? "w-2/3" : "w-full"}`} />
                  </div>
                  <p className="text-center text-[12px] text-muted-foreground">
                    {progress === "uploading" ? "Uploading..." : progress === "indexing" ? "Indexing and embedding..." : "Done!"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-border/60 px-6 py-4">
          <Button variant="ghost" size="sm" className="rounded-xl" onClick={step === 1 ? handleClose : () => setStep((s) => (s - 1) as 1 | 2 | 3)} disabled={uploading}>
            {step === 1 ? "Cancel" : <><ChevronLeft className="size-4" /> Back</>}
          </Button>
          {step < 3 ? (
            <Button size="sm" className="rounded-xl" disabled={step === 1 && !file} onClick={() => setStep((s) => (s + 1) as 2 | 3)}>
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button size="sm" className="rounded-xl" disabled={uploading} onClick={handleUpload}>
              {uploading ? <><Loader2 className="size-4 animate-spin" /> Working...</> : "Upload & Index"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update upload API to handle new fields**

In `app/api/admin/documents/upload/route.ts`, add handling for `name`, `description`, and `tags` FormData fields and save them to the DB alongside the existing upload logic.

Read the current `upload/route.ts` first, then add:
```ts
const customName = formData.get("name") as string | null;
const description = formData.get("description") as string | null;
const tagsRaw = formData.get("tags") as string | null;
const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) : [];
// Use customName ?? file.name when inserting into documents table
// Use description and tags when inserting into documents table
```

- [ ] **Step 3: Replace uploader in documents page**

In `app/admin/documents/page.tsx`, replace the `<DocumentUploader>` component with a trigger button and `<DocumentUploadModal>`:

```tsx
// Replace the DocumentUploader import with:
import { DocumentUploadModal } from "@/components/admin/DocumentUploadModal";

// Replace <DocumentUploader onSuccess={...} /> with:
<div id="upload">
  <Button onClick={() => setUploadOpen(true)} className="rounded-xl">
    <Upload className="size-4 mr-2" /> Upload document
  </Button>
  <DocumentUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={() => setTrigger((n) => n + 1)} />
</div>
```

Add `const [uploadOpen, setUploadOpen] = useState(false)` to the page state.

- [ ] **Step 4: Commit**

```bash
git add components/admin/DocumentUploadModal.tsx app/admin/documents/page.tsx
git commit -m "feat: 3-step document upload modal with name, scope, description, tags"
```

---

## Task 16: User sidebar resize

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`
- Modify: `components/ui/sidebar.tsx` (if width is hard-coded there)

- [ ] **Step 1: Check how sidebar width is set**

```bash
grep -n "w-\[" components/ui/sidebar.tsx | head -20
grep -n "width\|w-64\|w-56" components/ui/sidebar.tsx | head -20
```

- [ ] **Step 2: Add drag-resize to the AppSidebar**

Wrap the `<Sidebar>` with a resizable container. Add a drag handle on the right edge:

```tsx
// In components/sidebar/Sidebar.tsx, wrap the return:
const [width, setWidth] = useState(() => {
  if (typeof window === "undefined") return 256;
  return Number(localStorage.getItem("sidebar-width") ?? 256);
});
const dragging = useRef(false);

const onMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  dragging.current = true;
  const startX = e.clientX;
  const startW = width;

  const onMove = (ev: MouseEvent) => {
    if (!dragging.current) return;
    const newW = Math.max(48, Math.min(320, startW + ev.clientX - startX));
    setWidth(newW);
  };
  const onUp = () => {
    dragging.current = false;
    localStorage.setItem("sidebar-width", String(width));
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};

// Wrap the Sidebar component with a div that sets style width:
// NOTE: The shadcn Sidebar uses CSS variable --sidebar-width.
// Set it inline:
return (
  <div style={{ "--sidebar-width": `${width}px` } as React.CSSProperties} className="relative">
    <Sidebar collapsible="icon">
      {/* ... existing content ... */}
    </Sidebar>
    {/* Drag handle */}
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 hover:opacity-100 hover:bg-[#0066B3]/40 transition-opacity z-10"
    />
  </div>
);
```

- [ ] **Step 3: Verify**

Drag the right edge of the sidebar. Width changes. Refresh page — width is restored from localStorage. Collapsing sidebar with the toggle still works.

- [ ] **Step 4: Commit**

```bash
git add components/sidebar/Sidebar.tsx
git commit -m "feat: draggable resize handle on user sidebar, persisted to localStorage"
```

---

## Task 17: Update sidebar admin link and final wiring

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Update admin link to point to /admin**

In `components/sidebar/Sidebar.tsx`, find the admin link that currently goes to `/admin/documents` and change it to `/admin`:

```tsx
// Change:
onClick={() => window.location.href = "/admin/documents"}
// To:
onClick={() => window.location.href = "/admin"}
```

- [ ] **Step 2: Update legal documents**

Open `public/privacy-policy.md` and `public/terms-of-service.md`. Bump "Last updated" to 2026-04-19. Add to Privacy Policy §2 or §4: note that admin users can view full conversation content for moderation purposes. Add to Terms §4: users may not circumvent IP bans.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Fix any TypeScript errors. Common issues:
- Missing `isSuperAdmin` in session type → already fixed in Task 2
- `count()` import from drizzle-orm → already imported in API routes
- Async params in Next.js 16 route handlers → use `await params` (already done in all routes above)

- [ ] **Step 4: Final commit**

```bash
git add components/sidebar/Sidebar.tsx public/privacy-policy.md public/terms-of-service.md
git commit -m "feat: complete admin panel — stats, users, chats, reports, upload modal, sidebar resize, AI titles"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| DB: isAdmin, ipBanned, bannedIps, reports, tags | Task 1 |
| Auth: superadmin + DB isAdmin | Task 2 |
| Middleware: IP ban all routes | Task 3 |
| Admin layout shell + sidebar | Task 4 |
| Stats: usage + content metrics | Tasks 5–6 |
| User management: promote, demote, ban, delete | Tasks 7–8 |
| Chat viewer: all convs, full thread modal | Tasks 9–10 |
| Reports: admin queue, context modal, actions | Tasks 11–12 |
| User-facing report button + dialog | Task 13 |
| AI title generation + typewriter animation | Task 14 |
| 3-step document upload modal | Task 15 |
| Sidebar drag resize | Task 16 |
| Admin sidebar link → /admin, legal docs | Task 17 |
| Aesthetic: matches chat UI throughout | All UI tasks use same tokens |
