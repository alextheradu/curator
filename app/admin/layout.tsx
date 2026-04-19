import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/");

  const pending = await db
    .select({ id: reports.id })
    .from(reports)
    .where(eq(reports.status, "pending"));

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AdminSidebar pendingReports={pending.length} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
