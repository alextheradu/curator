"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Eye, FileText, Loader2, Pencil, Search, Sparkles, Trash2, X, Check, FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getDocumentScopeLabel } from "@/lib/documents";
import { toast } from "sonner";
import type { Citation, DocumentScope } from "@/lib/db/schema";

export interface Doc {
  id: string;
  name: string;
  description: string | null;
  scope: DocumentScope;
  seasonYear: number | null;
  pageCount: number;
  minioKey: string;
  uploadedAt: string;
}

interface Props {
  refreshTrigger: number;
  onPreview: (citation: Citation) => void;
  onDocumentsChange?: (docs: Doc[]) => void;
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

export function DocumentList({ refreshTrigger, onPreview, onDocumentsChange }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/documents");
    if (res.ok) {
      const rows = await res.json();
      setDocs(rows);
      onDocumentsChange?.(rows);
    }
    setLoading(false);
  }, [onDocumentsChange]);

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
      setDocs((previous) => {
        const next = previous.filter((d) => d.id !== id);
        onDocumentsChange?.(next);
        return next;
      });
      toast.success("Document removed.");
    } catch { toast.error("Failed to delete document."); }
    finally { setDeleting(null); }
  };

  const handleDescriptionSaved = (id: string, description: string) => {
    setDocs((previous) => {
      const next = previous.map((d) => d.id === id ? { ...d, description } : d);
      onDocumentsChange?.(next);
      return next;
    });
  };

  const seasonOptions = useMemo(
    () =>
      [...new Set(docs.map((doc) => doc.seasonYear).filter((year): year is number => typeof year === "number"))]
        .sort((a, b) => b - a),
    [docs]
  );

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return docs.filter((doc) => {
      if (scopeFilter === "general" && doc.scope !== "general") return false;
      if (scopeFilter === "season" && doc.scope !== "season") return false;
      if (scopeFilter.startsWith("season:") && doc.seasonYear !== Number(scopeFilter.slice(7))) return false;

      if (!normalizedQuery) return true;

      const haystack = [doc.name, doc.description ?? "", doc.minioKey].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [docs, query, scopeFilter]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-border/60 bg-card px-6 py-12 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading indexed documents...
        </div>
      </div>
    );
  }

  if (!docs.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border/70 bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FolderSearch className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">No documents indexed yet.</p>
          <p className="text-sm text-muted-foreground">Upload an FRC PDF to start building the retrieval library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-card p-4 shadow-[var(--shadow-card)] md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Document library</p>
          <p className="text-sm text-muted-foreground">
            {filteredDocs.length} of {docs.length} documents shown
          </p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative min-w-0 md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documents, descriptions, or paths"
              className="h-10 rounded-xl border-border/70 bg-background pl-9 shadow-[var(--shadow-card)]"
            />
          </div>

          <select
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
            className="h-10 rounded-xl border border-border/70 bg-background px-3 text-sm text-foreground shadow-[var(--shadow-card)] outline-none transition-colors focus:border-ring"
          >
            <option value="all">All documents</option>
            <option value="general">General</option>
            <option value="season">All seasonal docs</option>
            {seasonOptions.map((year) => (
              <option key={year} value={`season:${year}`}>
                {year} season
              </option>
            ))}
          </select>
        </div>
      </div>

      {!filteredDocs.length ? (
        <div className="rounded-3xl border border-border/60 bg-card px-6 py-12 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm font-medium text-foreground">No matching documents.</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different category or search term.</p>
        </div>
      ) : filteredDocs.map((doc) => (
        <div
          key={doc.id}
          className="rounded-3xl border border-border/60 bg-card px-4 py-4 shadow-[var(--shadow-card)] transition-colors hover:border-border hover:bg-card/95 md:px-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#0066B3]/15 bg-[#0066B3]/10">
              <FileText size={16} className="text-[#0066B3]" />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="truncate text-sm font-medium text-foreground md:text-[15px]">{doc.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full border-0 bg-[#0066B3]/10 text-[#0066B3]">
                      {getDocumentScopeLabel(doc.scope, doc.seasonYear)}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full border-0 bg-muted text-muted-foreground">
                      {doc.pageCount} pages
                    </Badge>
                    <Badge variant="secondary" className="rounded-full border-0 bg-muted text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl border-border/70 bg-background px-3"
                    title="Preview PDF"
                    onClick={() => onPreview({ type: "doc", label: doc.name, url: "", minioKey: doc.minioKey })}
                  >
                    <Eye size={14} />
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                  >
                    {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Storage path:</span> {doc.minioKey}
              </div>

              <DescriptionRow doc={doc} onSaved={handleDescriptionSaved} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
