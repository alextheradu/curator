import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { projects } from "@/lib/db/schema";
import { sanitizeProjectInput } from "@/lib/projects";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const projectFields = {
  id: projects.id,
  name: projects.name,
  icon: projects.icon,
  color: projects.color,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await withSessionDbAccess(session, (tx) => tx
    .select(projectFields)
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt)));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(req);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rateLimit = await enforceRequestRateLimit(req, "conversationMutate", session.user.id);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many project updates. Please slow down." }, { status: 429, headers });
  }

  const input = sanitizeProjectInput(await req.json().catch(() => ({})));
  const [project] = await withSessionDbAccess(session, (tx) => tx
    .insert(projects)
    .values({ userId: session.user.id, ...input })
    .returning(projectFields));

  return NextResponse.json(project, { headers });
}
