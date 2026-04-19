"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
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

  const fetchConvs = useCallback(async () => {
    const params = new URLSearchParams();
    const userId = searchParams.get("userId");
    if (userId) params.set("userId", userId);
    if (search) params.set("q", search);
    const res = await fetch(`/api/admin/chats?${params}`);
    setConvs(await res.json());
  }, [search, searchParams]);

  useEffect(() => { void fetchConvs(); }, [fetchConvs]);

  return (
    <>
      <div className="relative min-h-svh">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,_#0066B3_10%,_transparent)_0%,_transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl space-y-6 px-6 py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chats</h1>
            {searchParams.get("userId") && (
              <p className="mt-1 text-[13px] text-muted-foreground">Filtered by user</p>
            )}
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 rounded-xl pl-8 text-[13px]"
              placeholder="Search titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-[1.75rem] border border-border/60 bg-card shadow-[var(--shadow-card)]">
            {convs.length === 0 ? (
              <p className="px-5 py-10 text-center text-[13px] text-muted-foreground">
                No conversations found.
              </p>
            ) : (
              <table className="w-full text-[13px]">
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
