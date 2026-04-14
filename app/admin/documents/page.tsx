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
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-foreground">Indexed Documents</h2>
              <p className="text-xs text-muted-foreground">Stored PDFs and their extracted pages available to retrieval.</p>
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
