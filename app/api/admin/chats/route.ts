import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { conversations, users, messages, reports } from "@/lib/db/schema";
import { eq, desc, count, ilike, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("q") ?? "";

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      seasonYear: conversations.seasonYear,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      userId: conversations.userId,
      userName: users.name,
      userEmail: users.email,
      msgCount: count(messages.id),
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      and(
        userId ? eq(conversations.userId, userId) : undefined,
        search ? ilike(conversations.title, `%${search}%`) : undefined,
      )
    )
    .groupBy(conversations.id, users.name, users.email, users.id)
    .orderBy(desc(conversations.updatedAt))
    .limit(200);

  const pendingConvIds = new Set(
    (await db
      .select({ conversationId: reports.conversationId })
      .from(reports)
      .where(eq(reports.status, "pending"))
    ).map((r) => r.conversationId)
  );

  return NextResponse.json(
    rows.map((r) => ({ ...r, hasPendingReport: pendingConvIds.has(r.id) }))
  );
}
