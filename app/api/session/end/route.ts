import { NextResponse } from "next/server";
import { GUEST_MESSAGE_COUNT_COOKIE_NAME } from "@/lib/app-cookies";
import { deleteCookie } from "@/lib/cookies";
import { deleteGuestSessionCookie } from "@/lib/guest-session";

export async function POST() {
  const headers = new Headers();
  headers.append("Set-Cookie", deleteGuestSessionCookie());
  headers.append("Set-Cookie", deleteCookie(GUEST_MESSAGE_COUNT_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
  }));

  return NextResponse.json({ ok: true }, { headers });
}
