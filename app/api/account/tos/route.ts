import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { hasValidMutationOrigin } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  if (!hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tosAcceptedAt = new Date();

  try {
    const [user] = await withSessionDbAccess(session, (tx) => tx
      .update(users)
      .set({ tosAcceptedAt })
      .where(eq(users.id, session.user.id))
      .returning({ tosAcceptedAt: users.tosAcceptedAt }));

    return NextResponse.json({
      tosAcceptedAt: user?.tosAcceptedAt ?? tosAcceptedAt,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "42703"
    ) {
      return NextResponse.json(
        { error: "Terms acceptance is unavailable until the latest database migration is applied." },
        { status: 503 },
      );
    }

    throw error;
  }
}
