"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Flag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChatViewerModal } from "@/components/admin/ChatViewerModal";

interface ConvRow {
  id: string;
  title: string;
  seasonYear: number;
  createdAt: string;
  updatedAt: string;
  userName: string | null;
  userEmail: string;
  msgCount: number;
  hasPendingReport: boolean;
}

function ChatsContent() {
  const searchParams = useSearchParams();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    const userId = searchParams.get("userId");

    if (userId) params.set("userId", userId);
    if (search) params.set("q", search);

    void fetch(`/api/admin/chats?${params}`)
      .then((res) => res.json())
      .then((data: ConvRow[]) => {
        if (!cancelled) {
          setConvs(data);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [search, searchParams]);

  return (
    <>
      <div className="relative">
        <div className="relative mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admin panel
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Chats</h1>
            {searchParams.get("userId") && (
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">Filtered by user.</p>
            )}
            {!searchParams.get("userId") && (
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                Inspect conversation history, jump into reported threads, and search by title.
              </p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-card/70 p-2 shadow-[var(--shadow-card)]">
            <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-[1rem] border-white/6 bg-background/45 pl-8 text-[13px]"
              placeholder="Search titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/72 shadow-[var(--shadow-card)]">
            {convs.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                No conversations found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[680px] w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Title</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">User</th>
                      <th className="px-5 py-3 text-left font-medium text-muted-foreground">Season</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Msgs</th>
                      <th className="px-5 py-3 text-right font-medium text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convs.map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40"
                        onClick={() => setOpenId(c.id)}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{c.title}</span>
                            {c.hasPendingReport && <Flag className="size-3.5 shrink-0 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{c.userName ?? c.userEmail}</td>
                        <td className="px-5 py-3 text-muted-foreground">{c.seasonYear}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{c.msgCount}</td>
                        <td className="px-5 py-3 text-right text-muted-foreground">
                          {new Date(c.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ChatViewerModal conversationId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

export default function AdminChatsPage() {
  return (
    <Suspense>
      <ChatsContent />
    </Suspense>
  );
}
