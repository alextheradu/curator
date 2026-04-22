import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateDocumentDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { documents, docChunks } from "@/lib/db/schema";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq, asc } from "drizzle-orm";

const DESCRIPTION_MODELS = (
  process.env.OPENROUTER_DESCRIPTION_MODELS
  ?? "openai/gpt-4o-mini,openai/gpt-oss-120b:free"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const MAX_CHUNK_CHARS = 2_000;

function sanitizeForLlm(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "\uFFFD",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildFallbackDescription(docName: string, excerpts: string[]) {
  const combined = excerpts.join(" ").toLowerCase();

  let subject = "reference material";
  if (combined.includes("award")) subject = "awards";
  else if (combined.includes("rule") || combined.includes("manual")) subject = "rules and procedures";
  else if (combined.includes("strategy")) subject = "strategy";
  else if (combined.includes("team update")) subject = "team updates";
  else if (combined.includes("design") || combined.includes("field")) subject = "field or design details";

  let audience = "team members looking for quick background and citations";
  if (combined.includes("judge") || combined.includes("chairman's") || combined.includes("impact")) {
    audience = "students and mentors preparing submissions, presentations, or judge interviews";
  } else if (combined.includes("robot") || combined.includes("inspection")) {
    audience = "students, mentors, and inspectors checking requirements and implementation details";
  }

  return `${docName} covers ${subject} relevant to FRC teams. It is most useful for ${audience}.`;
}

async function generateDescription(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY!;
  const errors: string[] = [];

  for (const model of DESCRIPTION_MODELS) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "Curator FRC Assistant",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.3,
        }),
      });

      if (!res.ok) {
        errors.push(`${model}: ${await res.text()}`);
        continue;
      }

      const data = await res.json();
      const description = data.choices?.[0]?.message?.content?.trim();
      if (description) {
        return description;
      }

      errors.push(`${model}: empty response`);
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(errors.join(" | "));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminDocumentDescribe", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many description requests. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;

  const [doc] = await withAdminDbAccess(adminAuth.userId, (tx) => tx.select().from(documents).where(eq(documents.id, id)).limit(1));
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

  const chunks = await withAdminDbAccess(adminAuth.userId, (tx) => tx
    .select({ content: docChunks.content })
    .from(docChunks)
    .where(eq(docChunks.documentId, id))
    .orderBy(asc(docChunks.chunkIndex))
    .limit(4));

  if (chunks.length === 0) {
    return NextResponse.json({ error: "No chunks available for this document" }, { status: 400, headers });
  }

  const excerpts = chunks
    .map((chunk) => sanitizeForLlm(chunk.content).slice(0, MAX_CHUNK_CHARS))
    .filter(Boolean);

  const context = excerpts.map((content, i) => `[Chunk ${i + 1}]\n${content}`).join("\n\n");
  const prompt = `You are a document cataloguer. Given the opening pages of an FRC document, write a 2-3 sentence description that explains what the document covers and who it is useful for. Be concise and factual.\n\nDocument name: ${doc.name}\n\n${context}`;

  let description = "";
  try {
    description = await generateDescription(prompt);
  } catch (error) {
    console.error("Document description generation failed:", error);
    description = buildFallbackDescription(doc.name, excerpts);
  }

  revalidateDocumentDerivedCaches();
  return NextResponse.json({ description }, { headers });
}
