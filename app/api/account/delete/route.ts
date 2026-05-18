import { auth } from "@/auth";
import { deleteUserAccountData } from "@/lib/account-deletion";
import { validateJsonMutationRequest } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const invalidMutation = validateJsonMutationRequest(req);
  if (invalidMutation) return invalidMutation;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { confirmation?: string };
  if (body.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }

  await deleteUserAccountData(session.user.id);

  return NextResponse.json({ ok: true });
}
