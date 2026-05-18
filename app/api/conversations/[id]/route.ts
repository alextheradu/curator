import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { db } from "@/lib/db";
import { conversations, projects } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { getCachedPublicConversation, revalidatePublicConversation } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { readGuestSessionId } from "@/lib/guest-session";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (session?.user?.id) {
    const conversation = await withSessionDbAccess(session, async (tx) => {
      const [row] = await tx.select().from(conversations).where(eq(conversations.id, id)).limit(1);
      return row ?? null;
    });

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = session.user.id === conversation.userId;
    if (!isOwner && !conversation.isPublic) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation, access: isOwner ? "owner" : "public" });
  }

  // Guest: check if they own this conversation
  const guestId = await readGuestSessionId();
  if (guestId) {
    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .limit(1);

    if (conv) {
      return NextResponse.json({ conversation: conv, access: "owner" });
    }
  }

  // Fall back to public conversation
  const publicConv = await getCachedPublicConversation(id);
  if (!publicConv || !publicConv.isPublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: publicConv, access: "public" });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  const body = await req.json();

  if (!session?.user?.id) {
    const guestId = await readGuestSessionId();
    if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [existing] = await db.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [updated] = await db.update(conversations)
      .set({
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.seasonYear === "number" ? { seasonYear: body.seasonYear } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .returning();

    revalidateConversationDerivedCaches();
    return NextResponse.json(updated);
  }

  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
  }

  const hasProjectId = Object.prototype.hasOwnProperty.call(body, "projectId");
  const nextProjectId = hasProjectId && (typeof body.projectId === "string" || body.projectId === null)
    ? body.projectId
    : undefined;

  const [updated] = await withSessionDbAccess(session, async (tx) => {
    if (nextProjectId) {
      const [project] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, nextProjectId), eq(projects.userId, session.user.id)))
        .limit(1);

      if (!project) return [];
    }

    return tx.update(conversations)
      .set({
        ...(typeof body.title === "string" ? { title: body.title } : {}),
        ...(typeof body.seasonYear === "number" ? { seasonYear: body.seasonYear } : {}),
        ...(typeof body.isPublic === "boolean" ? { isPublic: body.isPublic } : {}),
        ...(nextProjectId !== undefined ? { projectId: nextProjectId } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id)))
      .returning();
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  revalidatePublicConversation(id);
  revalidateConversationDerivedCaches();
  return NextResponse.json(updated, { headers });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    const guestId = await readGuestSessionId();
    if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)));

    revalidateConversationDerivedCaches();
    return NextResponse.json({ ok: true });
  }

  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
  }

  await withSessionDbAccess(session, (tx) => tx.delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id))));

  revalidatePublicConversation(id);
  revalidateConversationDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}
