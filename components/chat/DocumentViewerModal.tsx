"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Citation } from "@/lib/db/schema";

interface Props {
  citation: Citation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewerModal({ citation, open, onOpenChange }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !citation || citation.type !== "doc") {
      setSignedUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (citation.url) {
      setSignedUrl(citation.url);
      setError(null);
      setLoading(false);
      return;
    }

    if (!citation.minioKey) {
      setSignedUrl(null);
      setError("This citation does not include a document reference.");
      setLoading(false);
      return;
    }

    const minioKey = citation.minioKey;

    let cancelled = false;

    async function loadSignedUrl() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/documents/presign?key=${encodeURIComponent(minioKey)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to open document");
        }

        if (!cancelled) {
          setSignedUrl(data.url);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to open document");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSignedUrl();
    return () => {
      cancelled = true;
    };
  }, [citation, open]);

  const viewerUrl = useMemo(() => {
    if (!signedUrl) return null;
    return citation?.pageNumber ? `${signedUrl}#page=${citation.pageNumber}` : signedUrl;
  }, [citation?.pageNumber, signedUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] max-w-6xl gap-3 border-border/60 bg-background/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground">
            <FileText className="size-4 text-[#0066B3]" />
            <span className="truncate">{citation?.label ?? "Document viewer"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {citation?.pageNumber ? `Opening at page ${citation.pageNumber}.` : "Opening source document."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading document preview...
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm text-muted-foreground">{error}</p>
                {signedUrl && (
                  <a
                    href={viewerUrl ?? signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Open in new tab
                  </a>
                )}
              </div>
            ) : viewerUrl ? (
              <iframe
                key={viewerUrl}
                src={viewerUrl}
                title={citation?.label ?? "Document preview"}
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Select a document citation to preview it here.
              </div>
            )}
          </div>

          {viewerUrl && (
            <div className="flex justify-end pt-3">
              <a
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ExternalLink className="size-4" />
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
