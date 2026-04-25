import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { conversations, projects } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { getCachedPublicConversation, revalidatePublicConversation } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const conversation = session?.user?.id
    ? await withSessionDbAccess(session, async (tx) => {
        const [row] = await tx.select().from(conversations).where(eq(conversations.id, id)).limit(1);
        return row ?? null;
      })
    : await getCachedPublicConversation(id);

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
  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
  }
  const { id } = await params;
  const body = await req.json();
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
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
  }
  const { id } = await params;

  await withSessionDbAccess(session, (tx) => tx.delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, session.user.id))));

  revalidatePublicConversation(id);
  revalidateConversationDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}
