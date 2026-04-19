import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { users, messages, conversations } from "@/lib/db/schema";
import { eq, count, ilike, or, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const search = req.nextUrl.searchParams.get("q") ?? "";
  const filter = req.nextUrl.searchParams.get("filter") ?? "all";

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      isAdmin: users.isAdmin,
      ipBanned: users.ipBanned,
      bannedIp: users.bannedIp,
      createdAt: users.createdAt,
      msgCount: count(messages.id),
    })
    .from(users)
    .leftJoin(conversations, eq(conversations.userId, users.id))
    .leftJoin(messages, eq(messages.conversationId, conversations.id))
    .where(
      search
        ? or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
        : undefined
    )
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  const filtered = rows.filter((u) => {
    if (filter === "admin") return u.isAdmin;
    if (filter === "banned") return u.ipBanned;
    return true;
  });

  return NextResponse.json(filtered);
}
