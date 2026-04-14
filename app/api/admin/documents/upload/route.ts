import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { uploadPdf } from "@/lib/minio";
import { extractChunks } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { ensureCollection, upsertChunks } from "@/lib/qdrant";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function POST(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const seasonYear = parseInt(formData.get("seasonYear") as string ?? "2026", 10);

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF file required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const minioKey = `${seasonYear}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  await uploadPdf(minioKey, buffer, buffer.length);
  const { chunks, pageCount } = await extractChunks(buffer);

  const [doc] = await db.insert(documents).values({
    name: file.name, seasonYear, minioKey, pageCount,
    uploadedById: session!.user!.id,
  }).returning();

  await ensureCollection();
  const embeddings = await embedBatch(chunks.map((c) => c.text));

  const qdrantPoints = chunks.map((chunk, i) => ({
    id: crypto.randomUUID(),
    vector: embeddings[i],
    payload: {
      doc_id: doc.id, doc_name: doc.name, season_year: seasonYear,
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
