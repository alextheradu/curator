import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-auth";
import { withDbAccessContext } from "@/lib/db/access";
import { reports, messages } from "@/lib/db/schema";
import { revalidateReportDerivedCaches } from "@/lib/cache-tags";
import { applyRateLimitHeaders, enforceRequestRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const userAuth = await requireAuth();
  if (!userAuth.ok) return userAuth.response;
  const rateLimit = await enforceRequestRateLimit(req, "report", userAuth.userId);

  const headers = new Headers();
  applyRateLimitHeaders(headers, rateLimit);

  if (!rateLimit.ok) {
    return NextResponse.json({ error: "Too many reports submitted. Try again later." }, { status: 429, headers });
  }

  const { messageId, reason } = await req.json() as { messageId: string; reason: string };
  if (!messageId || !reason?.trim()) {
    return NextResponse.json({ error: "messageId and reason are required" }, { status: 400, headers });
  }

  const [msg] = await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx
    .select({ id: messages.id, conversationId: messages.conversationId, role: messages.role })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1));
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404, headers });
  if (msg.role !== "assistant") {
    return NextResponse.json({ error: "Only assistant messages can be reported" }, { status: 400, headers });
  }

  // One report per user per message
  const [existing] = await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.messageId, messageId), eq(reports.reportedById, userAuth.userId)))
    .limit(1));
  if (existing) return NextResponse.json({ error: "Already reported" }, { status: 409, headers });

  await withDbAccessContext({ userId: userAuth.userId }, (tx) => tx.insert(reports).values({
    conversationId: msg.conversationId,
    messageId,
    reportedById: userAuth.userId,
    reason: reason.trim(),
    source: "user_report",
  }));

  revalidateReportDerivedCaches();

  return NextResponse.json({ ok: true }, { headers });
}
