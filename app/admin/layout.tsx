import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/admin-page-auth";
import { withAdminDbAccess } from "@/lib/db/access";
import { reports } from "@/lib/db/schema";
import { NO_INDEX_ROBOTS } from "@/lib/seo";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin",
  robots: NO_INDEX_ROBOTS,
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Database-backed: a demoted or deleted admin's JWT still says isAdmin
  // until it expires, so the claim alone must not open the admin area.
  const admin = await requireAdminPage();

  const pending = await withAdminDbAccess(admin.userId, (tx) => tx
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, "pending")));

  return (
    <div className="flex h-svh flex-col overflow-hidden bg-background text-foreground md:flex-row">
      <AdminSidebar pendingReports={pending.length} />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
