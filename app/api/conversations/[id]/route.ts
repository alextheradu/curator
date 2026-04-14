import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  const [updated] = await db.update(conversations)
    .set({
      ...(body.title && { title: body.title }),
      ...(body.seasonYear && { seasonYear: body.seasonYear }),
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
    .returning();

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
