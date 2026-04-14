import { NextRequest, NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/minio";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim();

  if (!key) {
    return NextResponse.json({ error: "Missing document key" }, { status: 400 });
  }

  try {
    const url = await getPresignedUrl(key);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Unable to open document" }, { status: 500 });
  }
}
