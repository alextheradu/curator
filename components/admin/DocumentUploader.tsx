"use client";

import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DocumentUploader({ onSuccess }: { onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [seasonYear, setSeasonYear] = useState(2026);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") { toast.error("Only PDF files are supported."); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("seasonYear", String(seasonYear));
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
    <div className="rounded-3xl border border-dashed border-border/70 bg-card/30 p-8 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0066B3]/20 bg-[#0066B3]/10">
          <Upload size={22} className="text-[#0066B3]" />
        </div>
        <div>
          <p className="font-medium text-foreground">Upload FRC Document</p>
          <p className="text-sm text-muted-foreground">PDF only. Use this for manuals, team updates, and rule supplements.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <select
            value={seasonYear}
            onChange={(e) => setSeasonYear(parseInt(e.target.value, 10))}
            className="rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground shadow-[var(--shadow-card)] outline-none transition-colors focus:border-[#0066B3]/40"
          >
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-10 rounded-xl border border-[#0066B3]/20 bg-[#0066B3] px-4 text-white shadow-[var(--shadow-card)] hover:bg-[#00579a]"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Indexing..." : "Choose PDF"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">The file is stored, chunked page-by-page, embedded, and added to the retrieval index.</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>
    </div>
  );
}
