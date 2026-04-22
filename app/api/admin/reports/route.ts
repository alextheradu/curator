import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCachedAdminReports } from "@/lib/admin-cache";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const rows = await getCachedAdminReports();
  return NextResponse.json(rows);
}
