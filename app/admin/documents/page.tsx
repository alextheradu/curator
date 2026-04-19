"use client";

import { useMemo, useState } from "react";
import { DocumentUploader } from "@/components/admin/DocumentUploader";
import { DocumentList, type Doc } from "@/components/admin/DocumentList";
import { DocumentViewerModal } from "@/components/chat/DocumentViewerModal";
import Link from "next/link";
import { ChevronLeft, FolderKanban, LibraryBig, Shield, Sparkles, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Citation } from "@/lib/db/schema";

export default function AdminDocumentsPage() {
  const [trigger, setTrigger] = useState(0);
  const [previewCitation, setPreviewCitation] = useState<Citation | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);

  const stats = useMemo(() => {
    const seasons = new Set(
      documents
        .map((doc) => doc.seasonYear)
        .filter((year): year is number => typeof year === "number")
    );
    const generalCount = documents.filter((doc) => doc.scope === "general").length;
    const totalPages = documents.reduce((sum, doc) => sum + doc.pageCount, 0);

    return [
      {
        label: "Indexed docs",
        value: documents.length,
        detail: documents.length === 1 ? "1 document available" : `${documents.length} documents available`,
        icon: LibraryBig,
      },
      {
        label: "Season buckets",
        value: seasons.size,
        detail: seasons.size > 0 ? `${Math.min(...seasons)} to ${Math.max(...seasons)}` : "No seasonal docs yet",
        icon: FolderKanban,
      },
      {
        label: "General docs",
        value: generalCount,
        detail: generalCount === 0 ? "No evergreen reference docs yet" : "Available across all chats",
        icon: Sparkles,
      },
      {
        label: "Pages indexed",
        value: totalPages,
        detail: "Across the current retrieval library",
        icon: LibraryBig,
      },
    ];
  }, [documents]);

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_14%,_transparent)_0%,_transparent_72%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-8">
        <header className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft size={14} />
              Back to chat
            </Link>

            <Badge variant="secondary" className="rounded-full border-0 bg-muted px-3 py-1 text-muted-foreground">
              Admin-only
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-end">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#0066B3]/15 bg-[#0066B3]/10 text-[#0066B3] shadow-[var(--shadow-card)]">
                  <Shield size={18} />
                </div>
                <Badge variant="secondary" className="rounded-full border-0 bg-[#0066B3]/10 px-3 py-1 text-[#0066B3]">
                  Retrieval control center
                </Badge>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Document Management</h1>
                <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-[15px]">
                  Upload source PDFs, keep seasons organized, and tune what Curator can cite. This page now uses the same quieter palette and card system as the rest of the product instead of a separate admin dashboard style.
                </p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm font-medium text-foreground">Quick actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="#upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Upload className="size-4" />
                  Upload
                </a>
                <a
                  href="#library"
                  className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LibraryBig className="size-4" />
                  Library
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <stat.icon className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{stat.detail}</p>
              </div>
            ))}
          </div>
        </header>

        <main className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <div id="upload">
              <DocumentUploader onSuccess={() => setTrigger((n) => n + 1)} />
            </div>

            <section id="library" className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Indexed documents</h2>
                <p className="text-sm text-muted-foreground">
                  Search, filter, preview, and clean up the PDFs currently available to retrieval.
                </p>
              </div>

              <DocumentList
                refreshTrigger={trigger}
                onPreview={(citation) => setPreviewCitation(citation)}
                onDocumentsChange={setDocuments}
              />
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-medium text-foreground">Navigation</p>
              <div className="mt-4 space-y-2">
                <a href="#upload" className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <span>Upload new PDF</span>
                  <Upload className="size-4" />
                </a>
                <a href="#library" className="flex items-center justify-between rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <span>Browse library</span>
                  <LibraryBig className="size-4" />
                </a>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-medium text-foreground">Library guidance</p>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Use the correct season when a document is tied to one game year. Put awards history, team handbooks, and other evergreen references in General.</p>
                <p>Descriptions are optional, but they make the library easier to scan and improve human admin workflow.</p>
                <p>Preview any PDF before deleting it so you do not remove the wrong version of a rules update.</p>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <DocumentViewerModal
        open={!!previewCitation}
        citation={previewCitation}
        onOpenChange={(open) => { if (!open) setPreviewCitation(null); }}
      />
    </div>
  );
}
