"use client";

import { useMemo } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Citation } from "@/lib/db/schema";
import { buildDocumentViewHref } from "@/lib/utils";

interface Props {
  citation: Citation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewerModal({ citation, open, onOpenChange }: Props) {
  const viewerUrl = useMemo(() => {
    if (!citation || citation.type !== "doc") {
      return null;
    }

    if (citation.url) {
      return citation.url;
    }

    if (citation.minioKey) {
      return buildDocumentViewHref(citation.minioKey, citation.pageNumber);
    }

    return null;
  }, [citation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[min(96vw,84rem)] max-w-none flex-col overflow-hidden gap-0 border border-border/70 bg-background p-0 shadow-[var(--shadow-float)]">
        <DialogHeader className="border-b border-border/60 bg-background px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground">
            <FileText className="size-4 text-[#0066B3]" />
            <span className="truncate">{citation?.documentName ?? citation?.label ?? "Document viewer"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {citation?.pageNumber ? `Opening at page ${citation.pageNumber}.` : "Opening source document."}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/60 bg-card/40 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {citation?.pageNumber ? `Fact-check this answer against page ${citation.pageNumber}.` : "Fact-check this answer against the source PDF."}
            </div>
            {viewerUrl ? (
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-4" />
                Open in new tab
              </a>
            ) : null}
          </div>

          {citation?.quote ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              <span aria-hidden="true">&ldquo;</span>
              {citation.quote}
              <span aria-hidden="true">&rdquo;</span>
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 bg-card/30 p-4">
          <div className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
            {viewerUrl ? (
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                title={citation?.documentName ?? citation?.label ?? "Document preview"}
                className="h-full w-full bg-background"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a document citation to preview it here.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
