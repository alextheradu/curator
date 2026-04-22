import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCachedAdminUsers } from "@/lib/admin-cache";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const search = req.nextUrl.searchParams.get("q") ?? "";
  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const rows = await getCachedAdminUsers(search, filter);
  return NextResponse.json(rows);
}
