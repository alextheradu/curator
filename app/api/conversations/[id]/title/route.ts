import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const TITLE_MODEL = process.env.OPENROUTER_TITLE_MODEL ?? "openai/gpt-4o-mini";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userAuth = await requireAuth(req);
  if (!userAuth.ok) return userAuth.response;

  const { id } = await params;

  const [conv] = await db
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1);

  if (!conv || conv.userId !== userAuth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(4);

  if (msgs.length < 2) return NextResponse.json({ title: null });

  const context = msgs
    .filter((m) => m.role !== "system")
    .slice(0, 3)
    .map((m) => `${m.role}: ${m.content.slice(0, 400)}`)
    .join("\n");

  try {
    const res = await fetch(OR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Generate a concise 3-6 word title for this conversation. Return ONLY the title, no quotes, no punctuation at end.",
          },
          { role: "user", content: context },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return NextResponse.json({ title: null });

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const title = data.choices?.[0]?.message?.content?.trim();
    if (!title) return NextResponse.json({ title: null });

    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: null });
  }
}
