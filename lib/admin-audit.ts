import type { NextRequest } from "next/server";
import { withSystemDbAccess } from "@/lib/db/access";
import { appLogs } from "@/lib/db/schema";
import { getClientIp } from "@/lib/request-context";

type AdminAuditInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
};

export async function writeAdminAuditLog(req: NextRequest, input: AdminAuditInput) {
  await withSystemDbAccess((tx) => tx.insert(appLogs).values({
    level: "info",
    source: "admin",
    message: `${input.action} ${input.targetType}`,
    path: req.nextUrl.pathname,
    userId: input.actorUserId,
    ip: getClientIp(req),
    details: {
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ...(input.details ?? {}),
    },
  }));
}
