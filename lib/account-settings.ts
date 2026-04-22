import { db } from "@/lib/db";
import { withSessionDbAccess } from "@/lib/db/access";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ChatMode } from "@/lib/store";

export const DEFAULT_CHAT_MODE: ChatMode = "veteran";

type UserAccountSettings = {
  isAdmin: boolean;
  defaultChatMode: ChatMode;
  preferredName: string | null;
  teamNumber: number | null;
  onboardedAt: Date | null;
};

function isMissingColumn(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42703"
  );
}

export async function readUserAccountSettings(userId: string): Promise<UserAccountSettings> {
  try {
    const [row] = await db
      .select({
        isAdmin: users.isAdmin,
        defaultChatMode: users.defaultChatMode,
        preferredName: users.preferredName,
        teamNumber: users.teamNumber,
        onboardedAt: users.onboardedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      isAdmin: row?.isAdmin ?? false,
      defaultChatMode: row?.defaultChatMode ?? DEFAULT_CHAT_MODE,
      preferredName: row?.preferredName ?? null,
      teamNumber: row?.teamNumber ?? null,
      onboardedAt: row?.onboardedAt ?? null,
    };
  } catch (error) {
    if (!isMissingColumn(error)) {
      throw error;
    }

    const [row] = await db
      .select({
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      isAdmin: row?.isAdmin ?? false,
      defaultChatMode: DEFAULT_CHAT_MODE,
      preferredName: null,
      teamNumber: null,
      onboardedAt: null,
    };
  }
}

export async function readUserDefaultChatMode(
  session: { user?: { id?: string | null } } | null | undefined,
): Promise<ChatMode> {
  const userId = session?.user?.id;
  if (!userId) {
    return DEFAULT_CHAT_MODE;
  }

  try {
    const [row] = await withSessionDbAccess(session, (tx) => tx
      .select({ defaultChatMode: users.defaultChatMode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1));

    return row?.defaultChatMode ?? DEFAULT_CHAT_MODE;
  } catch (error) {
    if (!isMissingColumn(error)) {
      throw error;
    }

    return DEFAULT_CHAT_MODE;
  }
}
