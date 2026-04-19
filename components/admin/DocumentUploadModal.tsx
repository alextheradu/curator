"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { getDefaultSeasonYear, getSeasonYears } from "@/lib/seasons";
import type { DocumentScope } from "@/lib/db/schema";
import { toast } from "sonner";

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentUploadModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<DocumentScope>("season");
  const [seasonYear, setSeasonYear] = useState(getDefaultSeasonYear);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<"idle" | "uploading" | "indexing" | "done">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const seasons = getSeasonYears();

  const resetAll = () => {
    setStep(1);
    setFile(null);
    setName("");
    setScope("season");
    setSeasonYear(getDefaultSeasonYear());
    setDescription("");
    setTags("");
    setProgress("idle");
  };

  const handleClose = () => { resetAll(); onClose(); };

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") { toast.error("PDF only"); return; }
    if (f.size > MAX_PDF_SIZE_BYTES) { toast.error("Max 250 MB"); return; }
    setFile(f);
    setName(f.name.replace(/\.pdf$/i, ""));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("scope", scope);
      fd.append("name", name.trim() || file.name.replace(/\.pdf$/i, ""));
      if (description.trim()) fd.append("description", description.trim());
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length) fd.append("tags", JSON.stringify(tagList));
      if (scope === "season") fd.append("seasonYear", String(seasonYear));

      setProgress("indexing");
      const res = await fetch("/api/admin/documents/upload", { method: "POST", body: fd });
      const data = await res.json() as { error?: string; chunks?: number; pageCount?: number };
      if (!res.ok) throw new Error(data.error);

      setProgress("done");
      toast.success(`Indexed ${data.chunks} chunks from ${data.pageCount} pages.`);
      setTimeout(() => { handleClose(); onSuccess(); }, 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
      setProgress("idle");
    } finally {
      setUploading(false);
    }
  };

  const estimatedChunks = file ? Math.max(1, Math.ceil((file.size / 1024 / 1024) * 8)) : 0;

  const progressWidth = { idle: "0%", uploading: "33%", indexing: "66%", done: "100%" }[progress];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="w-full max-w-lg rounded-[1.75rem] border border-border/60 bg-card/95 p-0 shadow-[var(--shadow-float)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-base font-semibold">Upload document</DialogTitle>
          <div className="mt-2 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold transition-colors ${
                  s < step
                    ? "bg-[#0066B3] text-white"
                    : s === step
                    ? "bg-[#0066B3]/20 text-[#0066B3]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="size-3" /> : s}
              </div>
            ))}
            <span className="ml-1 text-[12px] text-muted-foreground">
              {step === 1 ? "Choose file" : step === 2 ? "Add details" : "Confirm & upload"}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          {/* Step 1: File */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Choose a PDF to upload to the retrieval library.
              </p>
              <div
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-background px-4 py-10 transition-colors hover:border-[#0066B3]/40 hover:bg-[#0066B3]/5"
                onClick={() => inputRef.current?.click()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="size-8 text-muted-foreground" />
                {file ? (
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">{file.name}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                ) : (
                  <p className="text-[13px] text-muted-foreground">
                    Drop PDF here or click to browse
                  </p>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          )}

          {/* Step 2: Metadata */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Scope</label>
                <div className="flex gap-2">
                  {(["season", "general"] as DocumentScope[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={`rounded-xl px-3 py-1.5 text-[13px] transition-colors ${
                        scope === s
                          ? "bg-[#0066B3]/10 text-[#0066B3]"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {scope === "season" && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Season year</label>
                  <select
                    value={seasonYear}
                    onChange={(e) => setSeasonYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-[13px] text-foreground"
                  >
                    {seasons.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">
                  Description (optional)
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this document cover?"
                  className="min-h-[80px] resize-none rounded-xl text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">
                  Tags (optional, comma-separated)
                </label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="rules, 2026, field"
                  className="rounded-xl text-[13px]"
                />
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2 rounded-2xl border border-border/60 bg-background p-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{name || file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scope</span>
                  <span className="font-medium text-foreground">
                    {scope === "season" ? `Season ${seasonYear}` : "General"}
                  </span>
                </div>
                {description && (
                  <div className="flex justify-between gap-4">
                    <span className="shrink-0 text-muted-foreground">Description</span>
                    <span className="text-right text-foreground">{description}</span>
                  </div>
                )}
                {tags && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tags</span>
                    <span className="text-foreground">{tags}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Est. chunks</span>
                  <span className="font-medium text-foreground">~{estimatedChunks}</span>
                </div>
              </div>

              {progress !== "idle" && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[#0066B3] transition-all duration-700"
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <p className="text-center text-[12px] text-muted-foreground">
                    {progress === "uploading" && "Uploading..."}
                    {progress === "indexing" && "Indexing and embedding..."}
                    {progress === "done" && "Done!"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-border/60 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={uploading}
            onClick={step === 1 ? handleClose : () => setStep((s) => (s - 1) as 1 | 2)}
          >
            {step === 1 ? "Cancel" : <><ChevronLeft className="size-4" /> Back</>}
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              className="rounded-xl"
              disabled={step === 1 && !file}
              onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="rounded-xl"
              disabled={uploading}
              onClick={handleUpload}
            >
              {uploading ? (
                <><Loader2 className="size-4 animate-spin" /> Working...</>
              ) : (
                "Upload & Index"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
