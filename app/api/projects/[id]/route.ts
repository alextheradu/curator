import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { projects } from "@/lib/db/schema";
import { sanitizeProjectInput } from "@/lib/projects";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const projectFields = {
  id: projects.id,
  name: projects.name,
  icon: projects.icon,
  color: projects.color,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many project updates. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;
  const input = sanitizeProjectInput(await req.json().catch(() => ({})));
  const [project] = await withSessionDbAccess(session, (tx) => tx
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
    .returning(projectFields));

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  return NextResponse.json(project, { headers });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many project updates. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;
  await withSessionDbAccess(session, (tx) => tx
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id))));

  return NextResponse.json({ ok: true }, { headers });
}
