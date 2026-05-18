import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateDocumentDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { documents, docChunks } from "@/lib/db/schema";
import { normalizeDocumentScope } from "@/lib/documents";
import { deletePdf, uploadPdf } from "@/lib/minio";
import { extractChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { deleteChunksByDocId, ensureCollection, upsertChunks } from "@/lib/qdrant";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { eq } from "drizzle-orm";
import { z } from "zod";

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;
const PDF_PARSE_TIMEOUT_MS = 60_000;

const TagsSchema = z.array(z.string().trim().min(1).max(64)).max(20);

function sanitizeDocumentText(value: string, maxLength: number) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hasPdfMagicBytes(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

function extractChunksWithTimeout(buffer: Buffer) {
  return Promise.race([
    extractChunks(buffer),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("PDF text extraction timed out")), PDF_PARSE_TIMEOUT_MS);
    }),
  ]);
}

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
      { error: "Upload could not be parsed. Make sure the PDF is valid and under 50 MB." },
      { status: 400, headers },
    );
  }

  const file = formData.get("file") as File | null;
  const scope = normalizeDocumentScope(formData.get("scope"));
  const seasonYear = scope === "season"
    ? parseInt((formData.get("seasonYear") as string) ?? "2026", 10)
    : null;
  const customNameRaw = (formData.get("name") as string | null)?.trim() || null;
  const descriptionRaw = (formData.get("description") as string | null)?.trim() || null;
  const customName = customNameRaw ? sanitizeDocumentText(customNameRaw, 200) : null;
  const description = descriptionRaw ? sanitizeDocumentText(descriptionRaw, 2000) : null;
  const tagsRaw = formData.get("tags") as string | null;
  let tags: string[] = [];
  if (tagsRaw) {
    try {
      const parsedTags = TagsSchema.safeParse(JSON.parse(tagsRaw));
      if (!parsedTags.success) {
        return NextResponse.json({ error: "Tags must be an array of short strings." }, { status: 400, headers });
      }
      tags = [...new Set(parsedTags.data)];
    } catch {
      return NextResponse.json({ error: "Tags must be valid JSON." }, { status: 400, headers });
    }
  }

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400, headers });
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "PDF must be 50 MB or smaller." }, { status: 413, headers });
  }
  if (scope === "season" && !Number.isInteger(seasonYear)) {
    return NextResponse.json({ error: "A valid season is required." }, { status: 400, headers });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasPdfMagicBytes(buffer)) {
    return NextResponse.json({ error: "PDF file required" }, { status: 400, headers });
  }

  const keyPrefix = scope === "general" ? "general" : String(seasonYear);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._]+/, "") || "document.pdf";
  const minioKey = `${keyPrefix}/${crypto.randomUUID()}-${safeName}`;

  let extracted: Awaited<ReturnType<typeof extractChunks>>;
  try {
    extracted = await extractChunksWithTimeout(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF text extraction failed";
    return NextResponse.json({ error: message }, { status: 400, headers });
  }

  const { chunks, pageCount } = extracted;
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No extractable text found in this PDF" }, { status: 400, headers });
  }

  let uploaded = false;
  let doc: typeof documents.$inferSelect | null = null;
  let qdrantUpserted = false;

  try {
    await uploadPdf(minioKey, buffer, buffer.length);
    uploaded = true;

    [doc] = await withAdminDbAccess(adminAuth.userId, (tx) => tx.insert(documents).values({
      name: customName ?? sanitizeDocumentText(file.name, 200),
      description,
      tags,
      scope,
      seasonYear,
      minioKey,
      pageCount,
      uploadedById: adminAuth.userId,
    }).returning());
    if (!doc) {
      throw new Error("Document insert failed");
    }
    const savedDoc = doc;

    await ensureCollection();
    const embeddings = await embedBatch(chunks.map((c) => c.text));

    const qdrantPoints = chunks.map((chunk, i) => ({
      id: crypto.randomUUID(),
      vector: embeddings[i],
      payload: {
        doc_id: savedDoc.id, doc_name: savedDoc.name, doc_scope: scope, season_year: seasonYear,
        page_number: chunk.pageNumber, chunk_index: chunk.chunkIndex,
        minio_key: minioKey, content: chunk.text,
      },
    }));

    await upsertChunks(qdrantPoints);
    qdrantUpserted = true;
    await withAdminDbAccess(adminAuth.userId, (tx) => tx.insert(docChunks).values(chunks.map((chunk, i) => ({
      documentId: savedDoc.id, chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber, content: chunk.text,
      qdrantPointId: qdrantPoints[i].id,
    }))));
  } catch (error) {
    const docId = doc?.id;
    await Promise.allSettled([
      qdrantUpserted && docId ? deleteChunksByDocId(docId) : Promise.resolve(),
      docId ? withAdminDbAccess(adminAuth.userId, (tx) => tx.delete(documents).where(eq(documents.id, docId))) : Promise.resolve(),
      uploaded ? deletePdf(minioKey) : Promise.resolve(),
    ]);
    throw error;
  }

  revalidateDocumentDerivedCaches();
  if (!doc) {
    throw new Error("Document upload failed");
  }
  await writeAdminAuditLog(req, {
    actorUserId: adminAuth.userId,
    action: "upload",
    targetType: "document",
    targetId: doc.id,
    details: { minioKey, chunks: chunks.length, pageCount },
  });
  return NextResponse.json({ ok: true, docId: doc.id, chunks: chunks.length, pageCount }, { headers });
}
