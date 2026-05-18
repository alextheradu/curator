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

    if (citation.minioKey) {
      return buildDocumentViewHref(citation.minioKey, citation.pageNumber);
    }

    if (citation.url) {
      try {
        const url = new URL(citation.url, "https://curator.local");
        if (url.origin === "https://curator.local" && url.pathname === "/api/documents/view") {
          return `${url.pathname}${url.search}`;
        }
      } catch {}
    }

    return null;
  }, [citation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[min(96vw,84rem)] max-w-none flex-col overflow-hidden gap-0 border border-border/70 bg-background p-0 shadow-[var(--shadow-float)]">
        <DialogHeader className="border-b border-border/60 bg-background px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-base text-foreground">
              <FileText className="size-4 shrink-0 text-[#0066B3]" />
              <span className="truncate">{citation?.documentName ?? citation?.label ?? "Document viewer"}</span>
            </DialogTitle>
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
          <DialogDescription className="text-xs text-muted-foreground">
            {citation?.pageNumber ? `Opening at page ${citation.pageNumber}.` : "Opening source document."}
          </DialogDescription>
        </DialogHeader>

        {citation?.quote ? (
          <div className="border-b border-border/60 bg-card/40 px-6 py-2.5">
            <p className="text-sm leading-6 text-muted-foreground">
              <span aria-hidden="true">&ldquo;</span>
              {citation.quote}
              <span aria-hidden="true">&rdquo;</span>
            </p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 bg-card/30 p-4">
          <div className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
            {viewerUrl ? (
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                title={citation?.documentName ?? citation?.label ?? "Document preview"}
                className="h-full w-full bg-background"
                sandbox="allow-scripts allow-same-origin"
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
