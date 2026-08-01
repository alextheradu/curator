import { cookies } from "next/headers";
import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { AGE_CONFIRMED_COOKIE_NAME } from "@/lib/app-cookies";
import { hasValidMutationOrigin } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// Records that this account passed the age gate (COPPA: confirmed 13+
// before sign-in). Only ever stamps forward from the client-set cookie -
// never retroactively challenges an existing session.
export async function PATCH(req: NextRequest) {
  if (!hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  if (cookieStore.get(AGE_CONFIRMED_COOKIE_NAME)?.value !== "true") {
    return NextResponse.json({ error: "Age not confirmed for this browser." }, { status: 400 });
  }

  const ageConfirmedAt = new Date();

  try {
    const [user] = await withSessionDbAccess(session, (tx) => tx
      .update(users)
      .set({ ageConfirmedAt })
      .where(eq(users.id, session.user.id))
      .returning({ ageConfirmedAt: users.ageConfirmedAt }));

    return NextResponse.json({
      ageConfirmedAt: user?.ageConfirmedAt ?? ageConfirmedAt,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "42703"
    ) {
      return NextResponse.json(
        { error: "Age confirmation is unavailable until the latest database migration is applied." },
        { status: 503 },
      );
    }

    throw error;
  }
}
