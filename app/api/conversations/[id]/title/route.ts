import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { withDbAccessContext } from "@/lib/db/access";
import { conversations, messages } from "@/lib/db/schema";
import { revalidatePublicConversation } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq, asc } from "drizzle-orm";

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const TITLE_MODEL = process.env.OPENROUTER_TITLE_MODEL ?? "openai/gpt-4o-mini";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userAuth = await requireAuth();
  if (!userAuth.ok) return userAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "conversationTitle", userAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many title generations. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;

  const [conv] = await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1));

  if (!conv || conv.userId !== userAuth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const msgs = await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .limit(4));

  const relevantMessages = msgs
    .filter((m) => m.role !== "system")
    .slice(0, 3);

  if (relevantMessages.length === 0) {
    return NextResponse.json({ title: null }, { headers });
  }

  const context = relevantMessages
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

    if (!res.ok) return NextResponse.json({ title: null }, { headers });

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const title = data.choices?.[0]?.message?.content?.trim();
    if (!title) return NextResponse.json({ title: null }, { headers });

    await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx
      .update(conversations)
      .set({ title })
      .where(eq(conversations.id, id)));
    revalidatePublicConversation(id);
    revalidateConversationDerivedCaches();
    return NextResponse.json({ title }, { headers });
  } catch {
    return NextResponse.json({ title: null }, { headers });
  }
}
