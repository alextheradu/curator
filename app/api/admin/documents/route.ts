import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { deletePdf } from "@/lib/minio";
import { deleteChunksByDocId } from "@/lib/qdrant";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const docs = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  return NextResponse.json(docs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, description } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.update(documents).set({ description }).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deletePdf(doc.minioKey);
  await deleteChunksByDocId(id);
  await db.delete(docChunks).where(eq(docChunks.documentId, id));
  await db.delete(documents).where(eq(documents.id, id));
  return NextResponse.json({ ok: true });
}
