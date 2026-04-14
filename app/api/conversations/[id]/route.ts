import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = session?.user?.id === conversation.userId;
  if (!isOwner && !conversation.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    conversation,
    access: isOwner ? "owner" : "public",
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const [updated] = await db.update(conversations)
    .set({
      ...(typeof body.title === "string" ? { title: body.title } : {}),
      ...(typeof body.seasonYear === "number" ? { seasonYear: body.seasonYear } : {}),
      ...(typeof body.isPublic === "boolean" ? { isPublic: body.isPublic } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  await db.delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
