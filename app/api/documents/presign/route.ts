import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getPresignedUrl } from "@/lib/minio";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimit = await enforceRequestRateLimit(request, "documentAccess", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many document requests. Please slow down." }, { status: 429, headers });
  }
  const key = request.nextUrl.searchParams.get("key")?.trim();

  if (!key) {
    return NextResponse.json({ error: "Missing document key" }, { status: 400, headers });
  }

  const [doc] = await db.select({ id: documents.id }).from(documents).where(eq(documents.minioKey, key)).limit(1);
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404, headers });
  }

  try {
    const url = await getPresignedUrl(key);
    return NextResponse.json({ url }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to open document" }, { status: 500, headers });
  }
}
