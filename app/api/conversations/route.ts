import { auth } from "@/auth";
import { withGuestDbAccess, withSessionDbAccess } from "@/lib/db/access";
import { conversations, messages, projects } from "@/lib/db/schema";
import { revalidateConversationDerivedCaches } from "@/lib/cache-tags";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { maybeCleanupExpiredGuestConversations } from "@/lib/retention";
import { isUuid } from "@/lib/uuid";
import { DEFAULT_SEASON_YEAR } from "@/lib/seasons";
import {
  generateGuestSessionId,
  readGuestSessionId,
  serializeGuestSessionCookie,
} from "@/lib/guest-session";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

  if (!session?.user?.id) {
    const guestId = await readGuestSessionId();
    if (!guestId) return NextResponse.json([]);

    const rows = await withGuestDbAccess(guestId, (tx) => tx.select().from(conversations)
      .where(eq(conversations.guestId, guestId))
      .orderBy(desc(conversations.updatedAt)));

    return NextResponse.json(rows);
  }

  const rows = await withSessionDbAccess(session, (tx) => tx
    .select()
    .from(conversations)
    .where(eq(conversations.userId, session.user.id))
    .orderBy(desc(conversations.updatedAt)));

  if (rows.length === 0) {
    return NextResponse.json(rows);
  }

  const conversationIds = rows.map((row) => row.id);
  const messageRows = await withSessionDbAccess(session, (tx) => tx
    .select({
      conversationId: messages.conversationId,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .orderBy(asc(messages.createdAt)));

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

export async function POST(req: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(req);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  const body = await req.json().catch(() => ({}));

  if (!session?.user?.id) {
    const rateLimit = await enforceRequestRateLimit(req, "conversationCreate");
    const headers = new Headers();
    applyRateLimitHeaders(headers, rateLimit);
    if (!rateLimit.ok) {
      return NextResponse.json({ error: "Too many conversations created. Please slow down." }, { status: 429, headers });
    }

    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "New Chat";
    const seasonYear = typeof body.seasonYear === "number" && Number.isInteger(body.seasonYear)
      ? body.seasonYear
      : DEFAULT_SEASON_YEAR;

    let guestId = await readGuestSessionId();
    let isNewGuest = !guestId;
    if (!guestId) {
      guestId = generateGuestSessionId();
    } else {
      const currentGuestId = guestId;
      const [existingGuestConversation] = await withGuestDbAccess(currentGuestId, (tx) => tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.guestId, currentGuestId))
        .limit(1));

      if (!existingGuestConversation) {
        guestId = generateGuestSessionId();
        isNewGuest = true;
      }
    }

    const [conv] = await withGuestDbAccess(guestId, (tx) => tx.insert(conversations)
      .values({ guestId, title, seasonYear })
      .returning());

    const responseHeaders = headers;
    if (isNewGuest) {
      responseHeaders.set("Set-Cookie", serializeGuestSessionCookie(guestId));
    }

    maybeCleanupExpiredGuestConversations();
    revalidateConversationDerivedCaches();
    return NextResponse.json(conv, { headers: responseHeaders });
  }

  const rateLimit = await enforceRequestRateLimit(req, "conversationCreate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many conversations created. Please slow down." }, { status: 429, headers });
  }

  const { title = "New Chat", seasonYear = DEFAULT_SEASON_YEAR, projectId = null } = body;
  if (projectId !== null && (typeof projectId !== "string" || !isUuid(projectId))) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400, headers });
  }
  const [conv] = await withSessionDbAccess(session, async (tx) => {
    if (projectId) {
      const [project] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, session.user.id)))
        .limit(1);

      if (!project) return [];
    }

    return tx
      .insert(conversations)
      .values({ userId: session.user.id, title, seasonYear, projectId })
      .returning();
  });

  if (!conv) {
    return NextResponse.json({ error: "Project not found" }, { status: 404, headers });
  }

  revalidateConversationDerivedCaches();
  return NextResponse.json(conv, { headers });
}
