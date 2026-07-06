import { NextRequest, NextResponse } from "next/server";
import { resolveDocumentAccess } from "@/lib/document-access";

export async function GET(request: NextRequest) {
  const access = await resolveDocumentAccess(request);
  if (!access.ok) return access.response;

  return NextResponse.json({ url: access.url }, { headers: access.headers });
}
