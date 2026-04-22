import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getCachedAdminDocuments } from "@/lib/admin-cache";
import { revalidateDocumentDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { documents, docChunks } from "@/lib/db/schema";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";
import { deletePdf } from "@/lib/minio";
import { deleteChunksByDocId } from "@/lib/qdrant";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const docs = await getCachedAdminDocuments();
  return NextResponse.json(docs);
}

export async function PATCH(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminDocumentMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many document updates. Please slow down." }, { status: 429, headers });
  }
  const { id, description } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers });
  await withAdminDbAccess(adminAuth.userId, (tx) => tx.update(documents).set({ description }).where(eq(documents.id, id)));
  revalidateDocumentDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}

export async function DELETE(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminDocumentMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many document updates. Please slow down." }, { status: 429, headers });
  }
  const { id } = await req.json();
  const [doc] = await withAdminDbAccess(adminAuth.userId, (tx) => tx.select().from(documents).where(eq(documents.id, id)).limit(1));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

  await deletePdf(doc.minioKey);
  await deleteChunksByDocId(id);
  await withAdminDbAccess(adminAuth.userId, (tx) => tx.delete(docChunks).where(eq(docChunks.documentId, id)));
  await withAdminDbAccess(adminAuth.userId, (tx) => tx.delete(documents).where(eq(documents.id, id)));
  revalidateDocumentDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}
