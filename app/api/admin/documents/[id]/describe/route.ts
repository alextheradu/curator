import { auth } from "@/auth";
import { db } from "@/lib/db";
import { documents, docChunks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).includes(email ?? "");
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, id));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chunks = await db
    .select({ content: docChunks.content })
    .from(docChunks)
    .where(eq(docChunks.documentId, id))
    .orderBy(asc(docChunks.chunkIndex))
    .limit(4);

  if (chunks.length === 0) {
    return NextResponse.json({ error: "No chunks available for this document" }, { status: 400 });
  }

  const context = chunks.map((c, i) => `[Chunk ${i + 1}]\n${c.content}`).join("\n\n");
  const prompt = `You are a document cataloguer. Given the opening pages of an FRC document, write a 2-3 sentence description that explains what the document covers and who it is useful for. Be concise and factual.\n\nDocument name: ${doc.name}\n\n${context}`;

  const apiKey = process.env.OPENROUTER_API_KEY!;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      "X-Title": "Curator FRC Assistant",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b:free",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const description = data.choices?.[0]?.message?.content?.trim() ?? "";
  return NextResponse.json({ description });
}
