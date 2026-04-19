import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { normalizeDocumentScope } from "@/lib/documents";
import { uploadPdf } from "@/lib/minio";
import { extractChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { ensureCollection, upsertChunks } from "@/lib/qdrant";
import { NextResponse } from "next/server";

const MAX_PDF_SIZE_BYTES = 250 * 1024 * 1024;

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Upload could not be parsed. Make sure the PDF is valid and under 250 MB." },
      { status: 400 },
    );
  }

  const file = formData.get("file") as File | null;
  const scope = normalizeDocumentScope(formData.get("scope"));
  const seasonYear = scope === "season"
    ? parseInt((formData.get("seasonYear") as string) ?? "2026", 10)
    : null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }
  if (file.size > MAX_PDF_SIZE_BYTES) {
    return NextResponse.json({ error: "PDF must be 250 MB or smaller." }, { status: 413 });
  }
  if (scope === "season" && !Number.isInteger(seasonYear)) {
    return NextResponse.json({ error: "A valid season is required." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const keyPrefix = scope === "general" ? "general" : String(seasonYear);
  const minioKey = `${keyPrefix}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { chunks, pageCount } = await extractChunks(buffer);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "No extractable text found in this PDF" }, { status: 400 });
  }

  await uploadPdf(minioKey, buffer, buffer.length);

  const [doc] = await db.insert(documents).values({
    name: file.name, scope, seasonYear, minioKey, pageCount,
    uploadedById: session!.user!.id,
  }).returning();

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
  await db.insert(docChunks).values(chunks.map((chunk, i) => ({
    documentId: doc.id, chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber, content: chunk.text,
    qdrantPointId: qdrantPoints[i].id,
  })));

  return NextResponse.json({ ok: true, docId: doc.id, chunks: chunks.length, pageCount });
}
