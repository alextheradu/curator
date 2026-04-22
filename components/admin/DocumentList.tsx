"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  Eye,
  FileText,
  FolderClosed,
  FolderSearch,
  Layers3,
  LibraryBig,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getDocumentScopeLabel } from "@/lib/documents";
import { cn } from "@/lib/utils";
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

type ScopeView = "all" | "general" | "season";

interface FolderOption {
  id: string;
  label: string;
  detail: string;
  pageTotal: number;
}

function DescriptionRow({
  doc,
  onSaved,
}: {
  doc: Doc;
  onSaved: (id: string, desc: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(doc.description ?? "");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(doc.description ?? "");
  }, [doc.description]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/describe`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDraft(data.description);
      setEditing(true);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to generate description",
      );
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
      <div className="mt-auto space-y-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring"
          placeholder="Document description..."
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-lg px-3 text-xs"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Check size={11} />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 rounded-lg px-3 text-xs"
            onClick={cancel}
          >
            <X size={11} /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-auto space-y-2">
      {doc.description ? (
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {doc.description}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground/40">
          No description yet. Use the sparkle to draft one.
        </p>
      )}
      <div className="flex gap-1">
        <button
          title="Generate description with AI"
          onClick={generate}
          disabled={generating}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          {generating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
        </button>
        <button
          title="Edit description"
          onClick={() => setEditing(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}

function PaneButton({
  active,
  icon,
  label,
  detail,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-foreground hover:bg-muted/70",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border",
          active
            ? "border-white/15 bg-white/10 text-white"
            : "border-border/60 bg-background text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            active ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {detail}
        </p>
      </div>
    </button>
  );
}

function DocumentCard({
  doc,
  deleting,
  onPreview,
  onDelete,
  onSaved,
}: {
  doc: Doc;
  deleting: boolean;
  onPreview: (citation: Citation) => void;
  onDelete: (id: string) => void;
  onSaved: (id: string, description: string) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card/80 p-3 transition-colors hover:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/60 text-muted-foreground">
            <FileText size={16} />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">
              {doc.name}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-muted text-foreground"
              >
                {getDocumentScopeLabel(doc.scope, doc.seasonYear)}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full border-0 bg-muted text-muted-foreground"
              >
                {doc.pageCount} pages
              </Badge>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(doc.id)}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
        </Button>
      </div>

      <div className="mt-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Storage path
        </p>
        <p
          className="mt-1 truncate font-mono text-[11px] leading-5 text-foreground/75"
          title={doc.minioKey}
        >
          {doc.minioKey}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
        <button
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-foreground transition-colors hover:bg-muted"
          onClick={() =>
            onPreview({
              type: "doc",
              label: doc.name,
              url: "",
              minioKey: doc.minioKey,
            })
          }
        >
          <Eye size={12} />
          Preview
        </button>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <DescriptionRow doc={doc} onSaved={onSaved} />
      </div>
    </div>
  );
}

export function DocumentList({
  refreshTrigger,
  onPreview,
  onDocumentsChange,
}: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scopeView, setScopeView] = useState<ScopeView>("all");
  const [folderId, setFolderId] = useState("all");

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

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

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
    } catch {
      toast.error("Failed to delete document.");
    } finally {
      setDeleting(null);
    }
  };

  const handleDescriptionSaved = (id: string, description: string) => {
    setDocs((previous) => {
      const next = previous.map((d) =>
        d.id === id ? { ...d, description } : d,
      );
      onDocumentsChange?.(next);
      return next;
    });
  };

  const generalDocs = useMemo(
    () => docs.filter((doc) => doc.scope === "general"),
    [docs],
  );

  const seasonalDocs = useMemo(
    () => docs.filter((doc) => doc.scope === "season"),
    [docs],
  );

  const seasonFolders = useMemo(
    () =>
      [...new Set(seasonalDocs.map((doc) => doc.seasonYear).filter(Boolean))]
        .sort((a, b) => Number(b) - Number(a))
        .map((year) => {
          const yearDocs = seasonalDocs.filter((doc) => doc.seasonYear === year);
          return {
            id: `season:${year}`,
            label: String(year),
            detail: `${yearDocs.length} doc${yearDocs.length === 1 ? "" : "s"}`,
            pageTotal: yearDocs.reduce((sum, doc) => sum + doc.pageCount, 0),
          };
        }),
    [seasonalDocs],
  );

  const folderOptions = useMemo<FolderOption[]>(() => {
    if (scopeView === "general") {
      return [
        {
          id: "general",
          label: "General library",
          detail: `${generalDocs.length} doc${generalDocs.length === 1 ? "" : "s"}`,
          pageTotal: generalDocs.reduce((sum, doc) => sum + doc.pageCount, 0),
        },
      ];
    }

    if (scopeView === "season") {
      return [
        {
          id: "season:all",
          label: "All seasons",
          detail: `${seasonalDocs.length} doc${seasonalDocs.length === 1 ? "" : "s"}`,
          pageTotal: seasonalDocs.reduce((sum, doc) => sum + doc.pageCount, 0),
        },
        ...seasonFolders,
      ];
    }

    return [
      {
        id: "all",
        label: "All documents",
        detail: `${docs.length} doc${docs.length === 1 ? "" : "s"}`,
        pageTotal: docs.reduce((sum, doc) => sum + doc.pageCount, 0),
      },
      {
        id: "general",
        label: "General library",
        detail: `${generalDocs.length} doc${generalDocs.length === 1 ? "" : "s"}`,
        pageTotal: generalDocs.reduce((sum, doc) => sum + doc.pageCount, 0),
      },
      ...seasonFolders,
    ];
  }, [docs, generalDocs, scopeView, seasonFolders, seasonalDocs]);

  useEffect(() => {
    const validFolderIds = new Set(folderOptions.map((option) => option.id));
    if (validFolderIds.has(folderId)) return;

    if (scopeView === "general") {
      setFolderId("general");
      return;
    }

    if (scopeView === "season") {
      setFolderId("season:all");
      return;
    }

    setFolderId("all");
  }, [folderId, folderOptions, scopeView]);

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return docs.filter((doc) => {
      if (scopeView === "general" && doc.scope !== "general") return false;
      if (scopeView === "season" && doc.scope !== "season") return false;

      if (folderId === "general" && doc.scope !== "general") return false;
      if (folderId === "season:all" && doc.scope !== "season") return false;
      if (folderId.startsWith("season:")) {
        const year = Number(folderId.slice(7));
        if (Number.isFinite(year) && doc.seasonYear !== year) return false;
      }

      if (!normalizedQuery) return true;

      const haystack = [doc.name, doc.description ?? "", doc.minioKey]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [docs, folderId, query, scopeView]);

  const activeFolder = folderOptions.find((option) => option.id === folderId);
  const filteredPages = filteredDocs.reduce((sum, doc) => sum + doc.pageCount, 0);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-[1.5rem] border border-border/60 bg-card/70 px-6 py-12">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading indexed documents...
        </div>
      </div>
    );
  }

  if (!docs.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FolderSearch className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            No documents indexed yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Upload an FRC PDF to start building the retrieval library.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-border/60 bg-background/80 px-4 py-3">
        <Badge
          variant="secondary"
          className="rounded-full border-0 bg-muted text-foreground"
        >
          {filteredDocs.length} shown
        </Badge>
        <Badge
          variant="secondary"
          className="rounded-full border-0 bg-muted text-muted-foreground"
        >
          {filteredPages} pages
        </Badge>
        <Badge
          variant="secondary"
          className="rounded-full border-0 bg-muted text-muted-foreground"
        >
          {docs.length} indexed total
        </Badge>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/65">
        <div className="grid min-h-[52vh] lg:h-[calc(100svh-14rem)] lg:grid-cols-[200px_240px_minmax(0,1fr)]">
          <section className="order-2 border-b border-border/60 p-4 lg:order-1 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="mb-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Library
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the broad collection first.
              </p>
            </div>
            <div className="space-y-2">
              <PaneButton
                active={scopeView === "all"}
                icon={<LibraryBig size={15} />}
                label="Everything"
                detail={`${docs.length} documents`}
                onClick={() => setScopeView("all")}
              />
              <PaneButton
                active={scopeView === "season"}
                icon={<Layers3 size={15} />}
                label="Season folders"
                detail={`${seasonalDocs.length} seasonal docs`}
                onClick={() => setScopeView("season")}
              />
              <PaneButton
                active={scopeView === "general"}
                icon={<FolderClosed size={15} />}
                label="General library"
                detail={`${generalDocs.length} shared docs`}
                onClick={() => setScopeView("general")}
              />
            </div>
          </section>

          <section className="order-3 border-b border-border/60 p-4 lg:order-2 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="mb-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Folders
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dive into a year or stay broad.
              </p>
            </div>
            <div className="space-y-2">
              {folderOptions.map((option) => (
                <PaneButton
                  key={option.id}
                  active={folderId === option.id}
                  icon={<FolderClosed size={15} />}
                  label={option.label}
                  detail={`${option.detail} · ${option.pageTotal} pages`}
                  onClick={() => setFolderId(option.id)}
                />
              ))}
            </div>
          </section>

          <section className="order-1 flex min-h-0 flex-col lg:order-3">
            <div className="border-b border-border/60 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Documents
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">
                    {activeFolder?.label ?? "Documents"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {filteredDocs.length} document
                    {filteredDocs.length === 1 ? "" : "s"} in view · {filteredPages}{" "}
                    total pages
                  </p>
                </div>

                <div className="relative w-full xl:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search names, descriptions, or storage paths"
                    className="h-10 rounded-xl border-border/70 bg-background pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!filteredDocs.length ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/60 px-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No matching documents.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try a different folder or search term.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredDocs.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      deleting={deleting === doc.id}
                      onPreview={onPreview}
                      onDelete={handleDelete}
                      onSaved={handleDescriptionSaved}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
