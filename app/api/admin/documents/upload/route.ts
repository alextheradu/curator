import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateDocumentDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { documents, docChunks } from "@/lib/db/schema";
import { normalizeDocumentScope } from "@/lib/documents";
import { uploadPdf } from "@/lib/minio";
import { extractChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { ensureCollection, upsertChunks } from "@/lib/qdrant";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminDocumentUpload", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many document uploads. Please slow down." }, { status: 429, headers });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload could not be parsed. Make sure the PDF is valid and under 250 MB." },
      { status: 400, headers },
    );
  }

  const file = formData.get("file") as File | null;
  const scope = normalizeDocumentScope(formData.get("scope"));
  const seasonYear = scope === "season"
    ? parseInt((formData.get("seasonYear") as string) ?? "2026", 10)
    : null;
  const customName = (formData.get("name") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;
  const tagsRaw = formData.get("tags") as string | null;
  const tags: string[] = tagsRaw ? JSON.parse(tagsRaw) as string[] : [];

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400, headers });
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "PDF must be 250 MB or smaller." }, { status: 413, headers });
  }
  if (scope === "season" && !Number.isInteger(seasonYear)) {
    return NextResponse.json({ error: "A valid season is required." }, { status: 400, headers });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const keyPrefix = scope === "general" ? "general" : String(seasonYear);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._]+/, "");
  const minioKey = `${keyPrefix}/${Date.now()}-${safeName}`;

  const { chunks, pageCount } = await extractChunks(buffer);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No extractable text found in this PDF" }, { status: 400, headers });
  }

  await uploadPdf(minioKey, buffer, buffer.length);

  const [doc] = await withAdminDbAccess(adminAuth.userId, (tx) => tx.insert(documents).values({
    name: customName ?? file.name,
    description,
    tags,
    scope,
    seasonYear,
    minioKey,
    pageCount,
    uploadedById: adminAuth.userId,
  }).returning());

  await ensureCollection();
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  const qdrantPoints = chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: {
      doc_id: doc.id, doc_name: doc.name, doc_scope: scope, season_year: seasonYear,
      page_number: chunk.pageNumber, chunk_index: chunk.chunkIndex,
      minio_key: minioKey, content: chunk.text,
    },
  }));

  await upsertChunks(qdrantPoints);
  await withAdminDbAccess(adminAuth.userId, (tx) => tx.insert(docChunks).values(chunks.map((chunk, i) => ({
    documentId: doc.id, chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber, content: chunk.text,
    qdrantPointId: qdrantPoints[i].id,
  }))));

  revalidateDocumentDerivedCaches();
  return NextResponse.json({ ok: true, docId: doc.id, chunks: chunks.length, pageCount }, { headers });
}
