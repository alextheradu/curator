# Admin Documents Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `description` field to documents with AI-generation on demand, inline editing, and PDF preview from the admin document list.

**Architecture:** Add a nullable `description` column via Drizzle migration → wire PATCH + describe API endpoints → overhaul `DocumentList` with inline edit + AI button + preview button → add `DocumentViewerModal` to admin page.

**Tech Stack:** Drizzle ORM, PostgreSQL, OpenRouter (`openai/gpt-oss-120b:free`), Next.js App Router API routes, React, Tailwind, Lucide icons.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `lib/db/schema.ts` | Add `description` column to `documents` table |
| Create | `lib/db/migrations/0001_document_description.sql` | Migration SQL |
| Create | `lib/db/migrations/meta/_journal.json` | Updated journal |
| Modify | `app/api/admin/documents/route.ts` | Add `PATCH` handler for saving description |
| Create | `app/api/admin/documents/[id]/describe/route.ts` | AI-generate description from stored chunks |
| Modify | `components/admin/DocumentList.tsx` | Inline edit, AI button, preview button |
| Modify | `app/admin/documents/page.tsx` | Wire `DocumentViewerModal` for admin preview |

---

### Task 1: Add `description` column to schema

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add the column to the Drizzle schema**

In `lib/db/schema.ts`, change the `documents` table definition:

```ts
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),          // ← add this line
  seasonYear: integer("season_year").notNull(),
  minioKey: text("minio_key").notNull(),
  pageCount: integer("page_count").notNull().default(0),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedById: text("uploaded_by_id").references(() => users.id),
});
```

- [ ] **Step 2: Generate the migration**

```bash
cd /srv/md0/robotics/curator
npm run db:generate
```

Expected: Drizzle creates `lib/db/migrations/0001_*.sql` with `ALTER TABLE "documents" ADD COLUMN "description" text;`

- [ ] **Step 3: Run the migration**

```bash
npm run db:migrate
```

Expected: `[✓] Migrations applied` (or similar success output).

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/migrations/
git commit -m "feat: add description column to documents table"
```

---

### Task 2: PATCH endpoint — save description

**Files:**
- Modify: `app/api/admin/documents/route.ts`

- [ ] **Step 1: Add the PATCH handler**

Append to `app/api/admin/documents/route.ts` (after the `DELETE` export):

```ts
export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, description } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.update(documents).set({ description }).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Smoke-test manually**

In the browser DevTools console (while logged in as admin):
```js
await fetch('/api/admin/documents', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: '<any-doc-id-from-GET>', description: 'test desc' })
}).then(r => r.json())
// Expected: { ok: true }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/documents/route.ts
git commit -m "feat: PATCH /api/admin/documents to update description"
```

---

### Task 3: AI describe endpoint

**Files:**
- Create: `app/api/admin/documents/[id]/describe/route.ts`

- [ ] **Step 1: Create the route file**

```ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chunks = await db
    .select({ content: docChunks.content })
    .from(docChunks)
    .where(eq(docChunks.documentId, id))
    .orderBy(asc(docChunks.chunkIndex))
    .limit(4);

  if (chunks.length === 0) {
    return NextResponse.json({ error: "No chunks available for this document" }, { status: 400 });
  }

  const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join("\n\n");
  const prompt = `You are a document cataloguer. Given the opening pages of an FRC document, write a 2-3 sentence description that explains what the document covers and who it is useful for. Be concise and factual.\n\nDocument name: ${doc.name}\n\n${context}`;

  const apiKey = process.env.OPENROUTER_API_KEY!;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "Curator FRC Assistant",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b:free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const description = data.choices?.[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ description });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/documents/[id]/describe/route.ts
git commit -m "feat: POST /api/admin/documents/[id]/describe — AI-generate document description"
```

---

### Task 4: Overhaul DocumentList

**Files:**
- Modify: `components/admin/DocumentList.tsx`

- [ ] **Step 1: Replace DocumentList with the new implementation**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, FileText, Loader2, Pencil, Sparkles, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Citation } from "@/lib/db/schema";

interface Doc {
  id: string;
  name: string;
  description: string | null;
  seasonYear: number;
  pageCount: number;
  minioKey: string;
  uploadedAt: string;
}

interface Props {
  refreshTrigger: number;
  onPreview: (citation: Citation) => void;
}

function DescriptionRow({ doc, onSaved }: { doc: Doc; onSaved: (id: string, desc: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.description ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/describe`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.description);
      setEditing(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate description");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, description: draft }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(doc.id, draft);
      setEditing(false);
      toast.success("Description saved.");
    } catch {
      toast.error("Failed to save description.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(doc.description ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#0066B3]/40"
          placeholder="Document description…"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 rounded-lg border border-[#0066B3]/20 bg-[#0066B3] px-3 text-xs text-white hover:bg-[#00579a]"
            onClick={save}
            disabled={saving}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg px-3 text-xs" onClick={cancel}>
            <X size={11} /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-start gap-2">
      {doc.description ? (
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{doc.description}</p>
      ) : (
        <p className="flex-1 text-xs italic text-muted-foreground/50">No description yet.</p>
      )}
      <div className="flex shrink-0 gap-1">
        <button
          title="Generate with AI"
          onClick={generate}
          disabled={generating}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        </button>
        <button
          title="Edit description"
          onClick={() => setEditing(true)}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}

export function DocumentList({
  refreshTrigger,
  onPreview,
}: Props) {
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

  const handleDescriptionSaved = (id: string, description: string) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, description } : d));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!docs.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No documents indexed yet.</p>;
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:bg-card/70"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#0066B3]/15 bg-[#0066B3]/10">
              <FileText size={16} className="text-[#0066B3]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.seasonYear} · {doc.pageCount} pages · {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
              <DescriptionRow doc={doc} onSaved={handleDescriptionSaved} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Preview PDF"
                onClick={() =>
                  onPreview({
                    type: "doc",
                    label: doc.name,
                    url: "",
                    minioKey: doc.minioKey,
                  })
                }
              >
                <Eye size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
              >
                {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/DocumentList.tsx
git commit -m "feat: document list with inline description editing, AI generate, and PDF preview"
```

---

### Task 5: Wire DocumentViewerModal into admin page

**Files:**
- Modify: `app/admin/documents/page.tsx`

- [ ] **Step 1: Update the admin page**

```tsx
"use client";

import { useState } from "react";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentList } from "@/components/admin/DocumentList";
import { DocumentViewerModal } from "@/components/chat/DocumentViewerModal";
import Link from "next/link";
import { ChevronLeft, Shield } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

export default function AdminDocumentsPage() {
  const [trigger, setTrigger] = useState(0);
  const [previewCitation, setPreviewCitation] = useState<Citation | null>(null);

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_16%,_transparent)_0%,_transparent_68%)]" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <ChevronLeft size={14} />
              Back to chat
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#0066B3]/20 bg-[#0066B3]/10 text-[#0066B3] shadow-[var(--shadow-card)]">
                <Shield size={18} />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Document Management</h1>
                <p className="text-sm text-muted-foreground">Index FRC PDFs so answers can cite the manual instead of guessing.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-card)] backdrop-blur-sm">
            Admin-only RAG controls
          </div>
        </div>

        <div className="space-y-6">
          <DocumentUploader onSuccess={() => setTrigger((n) => n + 1)} />
          <div className="rounded-3xl border border-border/60 bg-card/30 p-5 shadow-[var(--shadow-card)] backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Indexed Documents</h2>
                <p className="text-xs text-muted-foreground">Stored PDFs and their extracted pages available to retrieval.</p>
              </div>
            </div>
            <DocumentList
              refreshTrigger={trigger}
              onPreview={(citation) => setPreviewCitation(citation)}
            />
          </div>
        </div>
      </div>

      <DocumentViewerModal
        open={!!previewCitation}
        citation={previewCitation}
        onOpenChange={(open) => { if (!open) setPreviewCitation(null); }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/documents/page.tsx
git commit -m "feat: wire DocumentViewerModal into admin page for PDF preview"
```

---

### Task 6: Update GET to return minioKey + description

The `GET /api/admin/documents` currently returns all columns via `db.select()`, but the `Doc` interface in `DocumentList` now needs `minioKey` and `description`. Verify they come through.

**Files:**
- Modify: `app/api/admin/documents/route.ts` (verify only — no change needed if `db.select()` returns all columns)

- [ ] **Step 1: Confirm full select**

The existing `GET` handler is:
```ts
const docs = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
```
`db.select()` with no column list returns all columns including `description` and `minioKey`. No change needed.

- [ ] **Step 2: Build check**

```bash
cd /srv/md0/robotics/curator
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit if any fixes were needed**

Only commit if TypeScript required changes. Otherwise move on.
