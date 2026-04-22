import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { reports } from "@/lib/db/schema";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin",
  robots: NO_INDEX_ROBOTS,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const pending = await withSessionDbAccess(session, (tx) => tx
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, "pending")));

  return (
    <div className="flex min-h-svh bg-[#0f0f0f] text-foreground">
      <AdminSidebar pendingReports={pending.length} />
      <main className="relative min-w-0 flex-1 overflow-y-auto pt-[4.75rem] md:pt-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
        {children}
      </main>
    </div>
  );
}
