import { NextRequest, NextResponse } from "next/server";
import { resolveDocumentAccess } from "@/lib/document-access";

export async function GET(request: NextRequest) {
  const access = await resolveDocumentAccess(request);
  if (!access.ok) return access.response;

  const page = Number(request.nextUrl.searchParams.get("page"));
  const target = Number.isFinite(page) && page > 0 ? `${access.url}#page=${page}` : access.url;
  return NextResponse.redirect(target, { headers: access.headers });
}
