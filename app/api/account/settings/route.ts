import { auth } from "@/auth";
import { DEFAULT_CHAT_MODE, readUserDefaultChatMode } from "@/lib/account-settings";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const VALID_CHAT_MODES = new Set(["rookie", "veteran"]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    defaultChatMode: await readUserDefaultChatMode(session),
  });
}

export async function PATCH(request: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(request);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const defaultChatMode = body?.defaultChatMode;

  if (!VALID_CHAT_MODES.has(defaultChatMode)) {
    return NextResponse.json({ error: "Invalid chat mode" }, { status: 400 });
  }

  let user;

  try {
    [user] = await withSessionDbAccess(session, (tx) => tx.update(users)
      .set({ defaultChatMode })
      .where(eq(users.id, session.user.id))
      .returning({ defaultChatMode: users.defaultChatMode }));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "42703"
    ) {
      return NextResponse.json(
        { error: "Account chat-style settings are unavailable until the latest database migration is applied." },
        { status: 503 },
      );
    }

    throw error;
  }

  return NextResponse.json({
    defaultChatMode: user?.defaultChatMode ?? DEFAULT_CHAT_MODE,
  });
}
