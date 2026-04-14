"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Doc { id: string; name: string; seasonYear: number; pageCount: number; uploadedAt: string; }

export function DocumentList({ refreshTrigger }: { refreshTrigger: number }) {
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8A8A8A]" /></div>;
  if (!docs.length) return <p className="py-8 text-center text-sm text-[#8A8A8A]">No documents indexed yet.</p>;

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-[#2e2e2e] bg-[#1a1a1a] px-4 py-3">
          <FileText size={16} className="shrink-0 text-[#ED1C24]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{doc.name}</p>
            <p className="text-xs text-[#8A8A8A]">
              {doc.seasonYear} · {doc.pageCount} pages · {new Date(doc.uploadedAt).toLocaleDateString()}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8A8A] hover:text-[#ED1C24]"
            onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
          >
            {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </Button>
        </div>
      ))}
    </div>
  );
}
