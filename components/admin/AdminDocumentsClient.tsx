"use client";

import { useMemo, useState } from "react";
import { DocumentUploadModal } from "@/components/admin/DocumentUploadModal";
import { DocumentList, type Doc } from "@/components/admin/DocumentList";
import { DocumentViewerModal } from "@/components/chat/DocumentViewerModal";
import { Button } from "@/components/ui/button";
import { FileStack, Upload } from "lucide-react";
import type { Citation } from "@/lib/db/schema";

export function AdminDocumentsClient() {
  const [trigger, setTrigger] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewCitation, setPreviewCitation] = useState<Citation | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);

  const stats = useMemo(() => {
    const totalPages = documents.reduce((sum, doc) => sum + doc.pageCount, 0);
    const generalCount = documents.filter((doc) => doc.scope === "general").length;
    const seasonFolderCount = new Set(
      documents
        .filter((doc) => doc.scope === "season" && typeof doc.seasonYear === "number")
        .map((doc) => doc.seasonYear)
    ).size;

    return [
      {
        label: "Indexed",
        value: documents.length,
        detail: `${documents.length} document${documents.length === 1 ? "" : "s"}`,
      },
      {
        label: "Pages",
        value: totalPages,
        detail: "Total PDF pages",
      },
      {
        label: "Season Folders",
        value: seasonFolderCount,
        detail: "Year-scoped references",
      },
      {
        label: "General",
        value: generalCount,
        detail: "Shared across chats",
      },
    ];
  }, [documents]);

  return (
    <div className="min-h-svh bg-transparent">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admin panel
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Documents</h1>
            <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
              Upload source PDFs, keep seasons organized, and manage what Curator can cite.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-xl"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="size-4" />
            Upload PDF
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-muted-foreground shadow-[var(--shadow-card)]"
            >
              <span className="font-medium text-foreground">{stat.value}</span> {stat.label.toLowerCase()}
              <span className="ml-1 text-muted-foreground/80">· {stat.detail}</span>
            </div>
          ))}
        </div>

        <section className="space-y-4 rounded-[1.75rem] border border-border/60 bg-card/60 p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/6 bg-white/[0.04] text-muted-foreground">
              <FileStack className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Retrieval library</h2>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                Browse the library by scope and season folder, then scan documents in a denser grid instead of one long list.
              </p>
            </div>
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
