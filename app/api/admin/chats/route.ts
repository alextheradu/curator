import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCachedAdminChats } from "@/lib/admin-cache";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("q") ?? "";
  const rows = await getCachedAdminChats(userId, search);
  return NextResponse.json(rows);
}
