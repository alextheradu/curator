"use client";

import { useMemo, useState } from "react";
import { DocumentUploadModal } from "@/components/admin/DocumentUploadModal";
import { DocumentList, type Doc } from "@/components/admin/DocumentList";
import { DocumentViewerModal } from "@/components/chat/DocumentViewerModal";
import { Button } from "@/components/ui/button";
import { FolderKanban, LibraryBig, Sparkles, Upload } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

export default function AdminDocumentsPage() {
  const [trigger, setTrigger] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
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
        detail: `${documents.length} document${documents.length === 1 ? "" : "s"} available`,
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
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
      <div className="relative mx-auto max-w-5xl space-y-8 px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Upload source PDFs, keep seasons organized, and tune what Curator can cite.
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="size-4" />
            Upload PDF
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{stat.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <stat.icon className="size-4" />
                </div>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">{stat.detail}</p>
            </div>
          ))}
        </div>

        {/* Library */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Indexed documents</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
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

      <DocumentUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => setTrigger((n) => n + 1)}
      />

      <DocumentViewerModal
        open={!!previewCitation}
        citation={previewCitation}
        onOpenChange={(open) => { if (!open) setPreviewCitation(null); }}
      />
    </div>
  );
}
