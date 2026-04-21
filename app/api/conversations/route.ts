import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations, messages } from "@/lib/db/schema";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

function buildSearchDescription(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt));

  if (rows.length === 0) {
    return NextResponse.json(rows);
  }

  const conversationIds = rows.map((row) => row.id);
  const messageRows = await db
    .select({
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .orderBy(asc(messages.createdAt));

  const descriptions = new Map<string, string>();
  for (const message of messageRows) {
    if (message.role === "system" || descriptions.has(message.conversationId)) {
      continue;
    }

    const snippet = buildSearchDescription(message.content);
    if (snippet) {
      descriptions.set(message.conversationId, snippet);
    }
  }

  return NextResponse.json(
    rows.map((row) => ({
      ...row,
      searchDescription: descriptions.get(row.id) ?? null,
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title = "New Chat", seasonYear = 2026 } = await req.json();
  const [conv] = await db.insert(conversations)
    .values({ userId: session.user.id, title, seasonYear })
    .returning();

  return NextResponse.json(conv);
}
