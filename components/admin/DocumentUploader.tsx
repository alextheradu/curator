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
    <div className="rounded-xl border border-dashed border-[#2e2e2e] bg-[#1a1a1a] p-8">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ED1C24]/10">
          <Upload size={22} className="text-[#ED1C24]" />
        </div>
        <div>
          <p className="font-medium text-white">Upload FRC Document</p>
          <p className="text-sm text-[#8A8A8A]">PDF only — game manuals, team updates, rule supplements</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={seasonYear} onChange={(e) => setSeasonYear(parseInt(e.target.value, 10))}
            className="rounded-lg border border-[#2e2e2e] bg-[#0f0f0f] px-3 py-2 text-sm text-white"
          >
            {[2026, 2025, 2024, 2023].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="bg-[#ED1C24] text-white hover:bg-[#c9151b]"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? "Indexing..." : "Choose PDF"}
          </Button>
        </div>
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
      </div>
    </div>
  );
}
