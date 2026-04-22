import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { revalidateReportDerivedCaches } from "@/lib/cache-tags";
import { withAdminDbAccess } from "@/lib/db/access";
import { reports, messages } from "@/lib/db/schema";
import { revalidatePublicConversation } from "@/lib/public-conversations";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "adminReportMutate", adminAuth.userId);
  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many moderation actions. Please slow down." }, { status: 429, headers });
  }

  const { id } = await params;
  const { action } = await req.json() as { action: "dismiss" | "delete_message" | "reviewed" };

  const [report] = await withAdminDbAccess(adminAuth.userId, (tx) => tx
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1));
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404, headers });

  if (action === "dismiss") {
    await withAdminDbAccess(adminAuth.userId, (tx) => tx
      .update(reports)
      .set({ status: "dismissed" })
      .where(eq(reports.id, id)));
  } else if (action === "delete_message") {
    await withAdminDbAccess(adminAuth.userId, (tx) => tx.delete(messages).where(eq(messages.id, report.messageId)));
    await withAdminDbAccess(adminAuth.userId, (tx) => tx
      .update(reports)
      .set({ status: "reviewed" })
      .where(eq(reports.id, id)));
    revalidatePublicConversation(report.conversationId);
  } else if (action === "reviewed") {
    await withAdminDbAccess(adminAuth.userId, (tx) => tx
      .update(reports)
      .set({ status: "reviewed" })
      .where(eq(reports.id, id)));
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400, headers });
  }

  revalidateReportDerivedCaches();
  return NextResponse.json({ ok: true }, { headers });
}
