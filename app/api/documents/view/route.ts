import { NextRequest, NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/minio";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim();
  const page = Number(request.nextUrl.searchParams.get("page"));

  if (!key) {
    return NextResponse.json({ error: "Missing document key" }, { status: 400 });
  }

  try {
    const url = await getPresignedUrl(key);
    const target = Number.isFinite(page) && page > 0 ? `${url}#page=${page}` : url;
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.json({ error: "Unable to open document" }, { status: 500 });
  }
}
