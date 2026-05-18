import { auth } from "@/auth";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const onboardingSchema = z.object({
  preferredName: z.string().trim().min(1).max(30),
  teamNumber: z.number().int().min(1).max(99_999).nullable(),
  chatMode: z.enum(["rookie", "veteran"]),
});

export async function PATCH(request: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(request);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid onboarding data" }, { status: 400 });
  }

  const { preferredName, teamNumber, chatMode } = parsed.data;
  const onboardedAt = new Date();

  try {
    const [user] = await withSessionDbAccess(session, (tx) => tx
      .update(users)
      .set({
        preferredName,
        teamNumber,
        defaultChatMode: chatMode,
        onboardedAt,
      })
      .where(eq(users.id, session.user.id))
      .returning({
        preferredName: users.preferredName,
        teamNumber: users.teamNumber,
        defaultChatMode: users.defaultChatMode,
        onboardedAt: users.onboardedAt,
      }));

    return NextResponse.json({
      preferredName: user?.preferredName ?? preferredName,
      teamNumber: user?.teamNumber ?? teamNumber,
      defaultChatMode: user?.defaultChatMode ?? chatMode,
      onboardedAt: user?.onboardedAt ?? onboardedAt,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "42703"
    ) {
      return NextResponse.json(
        { error: "Onboarding is unavailable until the latest database migration is applied." },
        { status: 503 },
      );
    }

    throw error;
  }
}
