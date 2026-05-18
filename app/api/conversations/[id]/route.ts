import { auth } from "@/auth";
import { withGuestDbAccess, withSessionDbAccess } from "@/lib/db/access";
import { conversations, projects } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { getCachedPublicConversation, revalidatePublicConversation, toPublicConversationDTO } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { readGuestSessionId } from "@/lib/guest-session";
import { hasValidMutationOrigin, validateJsonMutationRequest } from "@/lib/request-security";
import { isUuid } from "@/lib/uuid";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

    return NextResponse.json({
      conversation: isOwner ? conversation : toPublicConversationDTO(conversation),
      access: isOwner ? "owner" : "public",
    });
  }

  // Guest: check if they own this conversation
  const guestId = await readGuestSessionId();
  if (guestId) {
    const [conv] = await withGuestDbAccess(guestId, (tx) => tx.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .limit(1));

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const invalidMutation = validateJsonMutationRequest(req);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  if (!session?.user?.id) {
    const rateLimit = await enforceRequestRateLimit(req, "conversationMutate");
    const headers = new Headers();
    applyRateLimitHeaders(headers, rateLimit);
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
    }

    const guestId = await readGuestSessionId();
    if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

    const [existing] = await withGuestDbAccess(guestId, (tx) => tx.select({ id: conversations.id }).from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .limit(1));

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

    const [updated] = await withGuestDbAccess(guestId, (tx) => tx.update(conversations)
      .set({
        ...(typeof body.title === "string" ? { title: body.title.trim().slice(0, 120) } : {}),
        ...(typeof body.seasonYear === "number" ? { seasonYear: body.seasonYear } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId)))
      .returning());

    revalidateConversationDerivedCaches();
    return NextResponse.json(updated, { headers });
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
  if (typeof nextProjectId === "string" && !isUuid(nextProjectId)) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400, headers });
  }

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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });

  if (!session?.user?.id) {
    const rateLimit = await enforceRequestRateLimit(req, "conversationMutate");
    const headers = new Headers();
    applyRateLimitHeaders(headers, rateLimit);
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many conversation updates. Please slow down." }, { status: 429, headers });
    }

    const guestId = await readGuestSessionId();
    if (!guestId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });

    await withGuestDbAccess(guestId, (tx) => tx.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.guestId, guestId))));

    revalidateConversationDerivedCaches();
    return NextResponse.json({ ok: true }, { headers });
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
