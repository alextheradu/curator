"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, DatabaseZap, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultSeasonYear, getSeasonYears } from "@/lib/seasons";
import type { DocumentScope } from "@/lib/db/schema";
import { toast } from "sonner";

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024;

export function DocumentUploader({ onSuccess }: { onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [scope, setScope] = useState<DocumentScope>("season");
  const [seasonYear, setSeasonYear] = useState(getDefaultSeasonYear);
  const inputRef = useRef<HTMLInputElement>(null);
  const seasons = getSeasonYears();

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Only PDF files are supported."); return; }
    if (file.size > MAX_PDF_SIZE_BYTES) { toast.error("PDF must be 250 MB or smaller."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("scope", scope);
      if (scope === "season") {
        fd.append("seasonYear", String(seasonYear));
      }
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
    <section className="rounded-[2rem] border border-border/60 bg-card p-5 shadow-[var(--shadow-card)] md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          <div className="space-y-3">
            <Badge variant="secondary" className="rounded-full border-0 bg-[#0066B3]/10 px-3 py-1 text-[#0066B3]">
              Admin upload
            </Badge>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Add a document to the retrieval library</h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Upload a rules PDF, team update, field drawing, or supplement. Curator will store it, split it into chunks, embed it, and make it available for citations.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background px-4 py-5 shadow-[var(--shadow-card)] sm:px-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#0066B3]/15 bg-[#0066B3]/10 text-[#0066B3]">
                  <Upload size={22} />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Upload PDF</p>
                    <p className="text-sm text-muted-foreground">PDF only, up to 250 MB. Choose a season bucket or send the file to General.</p>
                  </div>

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <label className="space-y-1">
                      <span className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Category
                      </span>
                      <select
                        value={scope}
                        onChange={(e) => setScope(e.target.value as DocumentScope)}
                        className="h-10 min-w-36 rounded-xl border border-border/70 bg-card px-3 text-sm text-foreground shadow-[var(--shadow-card)] outline-none transition-colors focus:border-ring"
                      >
                        <option value="season">Season</option>
                        <option value="general">General</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        Season
                      </span>
                      <select
                        value={seasonYear}
                        onChange={(e) => setSeasonYear(parseInt(e.target.value, 10))}
                        disabled={scope !== "season"}
                        className="h-10 rounded-xl border border-border/70 bg-card px-3 text-sm text-foreground shadow-[var(--shadow-card)] outline-none transition-colors focus:border-ring"
                      >
                        {seasons.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Button
                      onClick={() => inputRef.current?.click()}
                      disabled={uploading}
                      className="h-10 rounded-xl bg-foreground px-4 text-background hover:bg-foreground/90"
                    >
                      {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {uploading ? "Indexing..." : "Choose PDF"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
          />
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-background px-4 py-5 shadow-[var(--shadow-card)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">What happens next</p>
              <p className="text-sm text-muted-foreground">The upload pipeline mirrors the retrieval stack the chat uses.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <FileStack className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Stored by category</p>
                  <p className="text-sm text-muted-foreground">Season documents stay tied to a specific year, while General is available across chats for awards, team history, and other evergreen references.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <DatabaseZap className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Indexed for citations</p>
                  <p className="text-sm text-muted-foreground">Pages are chunked, embedded, and added to the vector index so answers can cite the original PDF.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
