import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export type DbAccessContext = {
  userId?: string | null;
  isAdmin?: boolean;
  isSystem?: boolean;
};

export async function withDbAccessContext<T>(
  context: DbAccessContext,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select
        set_config('app.user_id', ${context.userId ?? ""}, true),
        set_config('app.is_admin', ${context.isAdmin ? "true" : "false"}, true),
        set_config('app.is_system', ${context.isSystem ? "true" : "false"}, true)
    `);

    return callback(tx);
  });
}

export function getSessionDbAccessContext(session: { user?: { id?: string | null; isAdmin?: boolean | null } } | null | undefined): DbAccessContext {
  return {
    userId: session?.user?.id ?? null,
    isAdmin: Boolean(session?.user?.isAdmin),
    isSystem: false,
  };
}

export async function withSessionDbAccess<T>(
  session: { user?: { id?: string | null; isAdmin?: boolean | null } } | null | undefined,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return withDbAccessContext(getSessionDbAccessContext(session), callback);
}

export async function withAdminDbAccess<T>(
  userId: string,
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return withDbAccessContext({ userId, isAdmin: true }, callback);
}

export async function withSystemDbAccess<T>(
  callback: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
) {
  return withDbAccessContext({ userId: "system", isSystem: true }, callback);
}
