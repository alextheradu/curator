"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  Loader2,
  PenSquare,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AssistantMarkdown } from "@/components/chat/AssistantMarkdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorId: string | null;
  authorName: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BlogPostForm {
  slug: string;
  title: string;
  summary: string;
  content: string;
  authorId: string | null;
  published: boolean;
}

type EditorTab = "write" | "preview" | "settings";

interface AdminAuthorRow {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
}

const EMPTY_FORM: BlogPostForm = {
  slug: "",
  title: "",
  summary: "",
  content: "",
  authorId: null,
  published: false,
};

const EDITOR_TABS: Array<{ id: EditorTab; label: string; icon: typeof PenSquare }> = [
  { id: "write", label: "Write", icon: PenSquare },
  { id: "preview", label: "Preview", icon: Eye },
  { id: "settings", label: "Settings", icon: Globe2 },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 200);
}

function slugifyInput(value: string) {
  return value
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .slice(0, 200);
}

function toForm(post: BlogPostRow): BlogPostForm {
  return {
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    content: post.content,
    authorId: post.authorId,
    published: post.published,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "Not published";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function BlogPostEditor() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [authors, setAuthors] = useState<AdminAuthorRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BlogPostForm>(EMPTY_FORM);
  const [savedSnapshot, setSavedSnapshot] = useState<BlogPostForm>(EMPTY_FORM);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<EditorTab>("write");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;

  const deferredSearch = useDeferredValue(search);
  const deferredPreviewContent = useDeferredValue(form.content);
  const currentUserId = session?.user?.id ?? null;

  const applySelection = useCallback((post: BlogPostRow | null) => {
    if (!post) {
      setSelectedId(null);
      const nextForm = { ...EMPTY_FORM, authorId: currentUserId };
      setForm(nextForm);
      setSavedSnapshot(nextForm);
      setSlugManuallyEdited(false);
      setActiveTab("write");
      return;
    }

    const nextForm = toForm(post);
    setSelectedId(post.id);
    setForm(nextForm);
    setSavedSnapshot(nextForm);
    setSlugManuallyEdited(true);
    setActiveTab("write");
  }, [currentUserId]);

  const loadAuthors = useCallback(async () => {
    try {
      const data = await readJson<AdminAuthorRow[]>(
        await fetch("/api/admin/users?filter=admin", { cache: "no-store" }),
      );
      setAuthors(data.filter((author) => author.isAdmin));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load authors.");
    }
  }, []);

  const loadPosts = useCallback(async (preferredId?: string | null) => {
    setLoading(true);
    try {
      const data = await readJson<BlogPostRow[]>(
        await fetch("/api/admin/blog", { cache: "no-store" }),
      );
      setPosts(data);

      const desiredId = preferredId === undefined ? selectedIdRef.current : preferredId;
      const explicitBlank = preferredId === null;
      const nextSelected = explicitBlank
        ? null
        : desiredId
          ? data.find((post) => post.id === desiredId) ?? null
          : data[0] ?? null;

      applySelection(nextSelected);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load blog posts.");
    } finally {
      setLoading(false);
    }
  }, [applySelection]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    void loadAuthors();
  }, [loadAuthors]);

  const filteredPosts = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) {
      return posts;
    }

    return posts.filter((post) => [post.title, post.summary, post.slug].join(" ").toLowerCase().includes(query));
  }, [deferredSearch, posts]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedId) ?? null,
    [posts, selectedId],
  );

  const selectedAuthor = useMemo(
    () => authors.find((author) => author.id === form.authorId) ?? null,
    [authors, form.authorId],
  );

  const selectedAuthorName = selectedAuthor?.name
    ?? selectedAuthor?.email
    ?? (selectedPost?.authorId === form.authorId ? selectedPost.authorName : null);

  const hasDraftContent = Boolean(
    form.title.trim() || form.slug.trim() || form.summary.trim() || form.content.trim(),
  );
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedSnapshot);
  const publishedCount = posts.filter((post) => post.published).length;
  const draftCount = posts.length - publishedCount;

  const handleNewPost = useCallback(() => {
    applySelection(null);
  }, [applySelection]);

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugManuallyEdited ? current.slug : slugify(value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const endpoint = selectedId ? `/api/admin/blog/${selectedId}` : "/api/admin/blog";
      const method = selectedId ? "PUT" : "POST";
      const saved = await readJson<BlogPostRow>(
        await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, slug: slugify(form.slug) }),
        }),
      );

      toast.success(selectedId ? "Post updated." : "Post created.");
      await loadPosts(saved.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;

    setDeleting(true);
    try {
      await readJson<{ ok: true }>(
        await fetch(`/api/admin/blog/${selectedId}`, {
          method: "DELETE",
        }),
      );
      toast.success("Post deleted.");
      setDeleteDialogOpen(false);
      await loadPosts(undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete the post.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 sm:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admin panel
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">News editor</h1>
            <p className="max-w-2xl text-[13px] leading-6 text-muted-foreground">
              Draft, preview, and publish Curator updates without splitting the page into competing columns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-muted-foreground shadow-[var(--shadow-card)]">
              <span className="font-medium text-foreground">{publishedCount}</span> published
            </div>
            <div className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] text-muted-foreground shadow-[var(--shadow-card)]">
              <span className="font-medium text-foreground">{draftCount}</span> drafts
            </div>
            <Link
              href="/news"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted"
            >
              <Eye className="size-3.5" />
              Public news
            </Link>
            <Button size="sm" variant="outline" className="rounded-xl" onClick={handleNewPost}>
              <Plus className="size-4" />
              New post
            </Button>
          </div>
        </div>

        <section className="rounded-[1.5rem] border border-border/60 bg-card/64 p-3 shadow-[var(--shadow-card)] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-3 lg:w-[18rem]">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.04] text-muted-foreground">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Posts
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {selectedPost ? selectedPost.title : "New draft"}
                </p>
              </div>
            </div>

            <div className="relative min-w-[13rem] flex-1">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-[1rem] border-white/6 bg-background/45 pl-8 text-[13px]"
                placeholder="Search posts..."
              />
            </div>

            <Button size="sm" variant="ghost" className="rounded-xl" onClick={handleNewPost}>
              <PenSquare className="size-4" />
              Blank draft
            </Button>
          </div>

          <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={handleNewPost}
              className={cn(
                "flex min-h-20 w-full items-start gap-3 rounded-[1.1rem] border px-3 py-3 text-left transition-colors",
                selectedId === null
                  ? "border-white/8 bg-white/[0.06] text-foreground shadow-[var(--shadow-card)]"
                  : "border-transparent bg-black/10 text-muted-foreground hover:border-white/6 hover:text-foreground",
              )}
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/6 bg-white/[0.03] text-muted-foreground">
                <PenSquare className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">New draft</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                  Start from a blank editor.
                </p>
              </div>
            </button>

            {loading ? (
              <div className="flex min-h-20 items-center justify-center rounded-[1.1rem] border border-border/60 bg-black/10 px-4 py-5 text-[13px] text-muted-foreground md:col-span-2 xl:col-span-3">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading posts...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-[1.1rem] border border-border/60 bg-black/10 px-4 py-6 text-center text-[13px] text-muted-foreground md:col-span-2 xl:col-span-3">
                {posts.length === 0 ? "No news posts yet." : "No posts match that search."}
              </div>
            ) : (
              filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => applySelection(post)}
                  className={cn(
                    "flex min-h-20 w-full items-start gap-3 rounded-[1.1rem] border px-3 py-3 text-left transition-colors",
                    selectedId === post.id
                      ? "border-white/8 bg-white/[0.06] text-foreground shadow-[var(--shadow-card)]"
                      : "border-transparent bg-black/10 text-muted-foreground hover:border-white/6 hover:text-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border",
                      post.published
                        ? "border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                        : "border-white/6 bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    {post.published ? <Globe2 className="size-4" /> : <Sparkles className="size-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-foreground">{post.title}</p>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          post.published
                            ? "border border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                            : "border border-border/60 bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted-foreground">
                      {post.summary}
                    </p>
                    <div className="mt-2 flex min-w-0 items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="truncate">{post.slug}</span>
                      <span className="shrink-0">{formatDate(post.published ? post.publishedAt : post.updatedAt)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border/60 bg-card/64 p-4 shadow-[var(--shadow-card)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Editor
              </p>
              <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
                {form.title.trim() || (selectedPost ? selectedPost.title : "New news post")}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {selectedPost ? `Updated ${formatDate(selectedPost.updatedAt)}` : "Unsaved draft"}
                </span>
                {selectedPost?.authorName ? <span>Author: {selectedPost.authorName}</span> : null}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    form.published
                      ? "border border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                      : "border border-border/60 bg-muted/40 text-muted-foreground",
                  )}
                >
                  {form.published ? "Published" : "Draft"}
                </span>
                {isDirty ? (
                  <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Unsaved changes
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedPost?.published ? (
                <Link
                  href={`/news/${selectedPost.slug}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/60 bg-card/70 px-3 text-[12px] font-medium text-foreground shadow-[var(--shadow-card)] transition-colors hover:bg-muted"
                >
                  <ExternalLink className="size-3.5" />
                  View live
                </Link>
              ) : null}
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => void handleSave()}
                disabled={saving || (!isDirty && !hasDraftContent)}
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                {selectedPost ? "Save changes" : "Create post"}
              </Button>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="News editor sections"
            className="mt-5 inline-flex w-full rounded-xl border border-border/60 bg-black/10 p-1 sm:w-auto"
          >
            {EDITOR_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors sm:flex-none",
                    active
                      ? "bg-foreground text-background shadow-[var(--shadow-card)]"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {activeTab === "write" ? (
              <div role="tabpanel" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Title
                    </label>
                    <Input
                      value={form.title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      className="h-11 rounded-[1rem] border-white/6 bg-background/45 text-[14px]"
                      placeholder="What changed in Curator?"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Summary
                    </label>
                    <Textarea
                      value={form.summary}
                      onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                      className="min-h-11 rounded-[1rem] border-white/6 bg-background/45 text-[14px] lg:min-h-11"
                      placeholder="Short index and metadata summary."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Markdown body
                  </label>
                  <Textarea
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    className="min-h-[54svh] rounded-[1rem] border-white/6 bg-background/45 font-mono text-[13px] leading-6"
                    placeholder={"# Release notes\n\nWrite the full update here using Markdown."}
                  />
                </div>
              </div>
            ) : null}

            {activeTab === "preview" ? (
              <div role="tabpanel" className="rounded-[1.35rem] border border-border/60 bg-card/72 p-5 shadow-[var(--shadow-card)] sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      form.published
                        ? "border border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                        : "border border-border/60 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {form.published ? "Published" : "Draft"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedPost?.publishedAt ? `Published ${formatDate(selectedPost.publishedAt)}` : "Not published yet"}
                  </span>
                </div>

                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                  {form.title.trim() || "Untitled post"}
                </h3>
                <p className="mt-3 max-w-3xl text-[15px] leading-7 text-muted-foreground">
                  {form.summary.trim() || "Add a short summary so the news index has a strong headline deck."}
                </p>

                <div className="mt-7 border-t border-border/60 pt-7">
                  {deferredPreviewContent.trim() ? (
                    <AssistantMarkdown content={deferredPreviewContent} className="text-[14px] leading-7" />
                  ) : (
                    <div className="rounded-[1.25rem] border border-dashed border-border/60 bg-black/10 px-4 py-12 text-center text-[13px] text-muted-foreground">
                      Start writing to preview the post here.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "settings" ? (
              <div role="tabpanel" className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-[1.35rem] border border-border/60 bg-black/10 p-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Author
                    </label>
                    <select
                      value={form.authorId ?? ""}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          authorId: event.target.value || null,
                        }));
                      }}
                      className="h-11 w-full rounded-[1rem] border border-white/6 bg-background/45 px-3 text-[14px] text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <option value="">No author</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name?.trim() || author.email}
                        </option>
                      ))}
                    </select>
                    <p className="text-[12px] leading-5 text-muted-foreground">
                      Public news shows this author using their preferred name when available.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Slug
                    </label>
                    <Input
                      value={form.slug}
                      onChange={(event) => {
                        setSlugManuallyEdited(true);
                        setForm((current) => ({ ...current, slug: slugifyInput(event.target.value) }));
                      }}
                      className="h-11 rounded-[1rem] border-white/6 bg-background/45 text-[14px]"
                      placeholder="release-notes-april-2026"
                    />
                    <p className="text-[12px] leading-5 text-muted-foreground">
                      {form.slug.trim() ? `/news/${form.slug}` : "A slug is required before publishing."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Status
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, published: !current.published }))}
                      className={cn(
                        "flex w-full items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition-colors",
                        form.published
                          ? "border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                          : "border-border/60 bg-background/45 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <div>
                        <p className="text-[13px] font-medium">
                          {form.published ? "Published" : "Draft"}
                        </p>
                        <p className="mt-1 text-[12px] leading-5">
                          {form.published
                            ? "This post appears on the public /news page."
                            : "Keep it hidden from public news until it is ready."}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-xl border",
                          form.published
                            ? "border-[#0066B3]/20 bg-[#0066B3]/10 text-[#8cc6f3]"
                            : "border-white/6 bg-white/[0.03] text-muted-foreground",
                        )}
                      >
                        {form.published ? <Globe2 className="size-4" /> : <PenSquare className="size-4" />}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.35rem] border border-border/60 bg-black/10 p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Metadata
                    </p>
                    <div className="mt-3 grid gap-3 text-[13px]">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                        <span className="text-muted-foreground">Created</span>
                        <span className="text-foreground">{formatDate(selectedPost?.createdAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                        <span className="text-muted-foreground">Updated</span>
                        <span className="text-foreground">{formatDate(selectedPost?.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                        <span className="text-muted-foreground">Published</span>
                        <span className="text-foreground">{formatDate(selectedPost?.publishedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2">
                        <span className="text-muted-foreground">Author</span>
                        <span className="truncate text-foreground">{selectedAuthorName ?? "Not assigned"}</span>
                      </div>
                    </div>
                  </div>

                  {selectedPost ? (
                    <div className="border-t border-border/60 pt-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-red-400 hover:text-red-300"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="size-4" />
                        Delete post
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete news post?"
        description="This permanently removes the post from admin and public news."
        confirmLabel="Delete post"
        destructive
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </>
  );
}
