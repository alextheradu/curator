import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { reports, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminAuth = await requireAdmin(req);
  if (!adminAuth.ok) return adminAuth.response;

  const { id } = await params;
  const { action } = await req.json() as { action: "dismiss" | "delete_message" | "reviewed" };

  const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "dismiss") {
    await db.update(reports).set({ status: "dismissed" }).where(eq(reports.id, id));
  } else if (action === "delete_message") {
    await db.delete(messages).where(eq(messages.id, report.messageId));
    await db.update(reports).set({ status: "reviewed" }).where(eq(reports.id, id));
  } else if (action === "reviewed") {
    await db.update(reports).set({ status: "reviewed" }).where(eq(reports.id, id));
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
