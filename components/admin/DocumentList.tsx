"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, FileText, Loader2, Pencil, Sparkles, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Citation } from "@/lib/db/schema";

interface Doc {
  id: string;
  name: string;
  description: string | null;
  seasonYear: number;
  pageCount: number;
  minioKey: string;
  uploadedAt: string;
}

interface Props {
  refreshTrigger: number;
  onPreview: (citation: Citation) => void;
}

function DescriptionRow({ doc, onSaved }: { doc: Doc; onSaved: (id: string, desc: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.description ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/describe`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.description);
      setEditing(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate description");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, description: draft }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(doc.id, draft);
      setEditing(false);
      toast.success("Description saved.");
    } catch {
      toast.error("Failed to save description.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(doc.description ?? "");
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#0066B3]/40"
          placeholder="Document description…"
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="h-7 rounded-lg border border-[#0066B3]/20 bg-[#0066B3] px-3 text-xs text-white hover:bg-[#00579a]"
            onClick={save}
            disabled={saving}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </Button>
          <Button size="sm" variant="ghost" className="h-7 rounded-lg px-3 text-xs" onClick={cancel}>
            <X size={11} /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-start gap-2">
      {doc.description ? (
        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{doc.description}</p>
      ) : (
        <p className="flex-1 text-xs italic text-muted-foreground/40">No description — click ✦ to generate.</p>
      )}
      <div className="flex shrink-0 gap-1">
        <button
          title="Generate description with AI"
          onClick={generate}
          disabled={generating}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-[#0066B3] disabled:opacity-40"
        >
          {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        </button>
        <button
          title="Edit description"
          onClick={() => setEditing(true)}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}

export function DocumentList({ refreshTrigger, onPreview }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    if (res.ok) setDocs(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed");
      setDocs((p) => p.filter((d) => d.id !== id));
      toast.success("Document removed.");
    } catch { toast.error("Failed to delete document."); }
    finally { setDeleting(null); }
  };

  const handleDescriptionSaved = (id: string, description: string) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, description } : d));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!docs.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No documents indexed yet.</p>;
  }

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 shadow-[var(--shadow-card)] transition-colors hover:bg-card/70"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#0066B3]/15 bg-[#0066B3]/10">
              <FileText size={16} className="text-[#0066B3]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.seasonYear} · {doc.pageCount} pages · {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
              <DescriptionRow doc={doc} onSaved={handleDescriptionSaved} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Preview PDF"
                onClick={() => onPreview({ type: "doc", label: doc.name, url: "", minioKey: doc.minioKey })}
              >
                <Eye size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => handleDelete(doc.id)}
                disabled={deleting === doc.id}
              >
                {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
