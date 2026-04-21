import { auth } from "@/auth";
import { db } from "@/lib/db";
import { bannedIps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export default auth(async (req) => {
  const ip = getClientIp(req);

  if (ip !== "unknown") {
    const [ban] = await db
      .select({ ip: bannedIps.ip })
      .from(bannedIps)
      .where(eq(bannedIps.ip, ip))
      .limit(1);

    if (ban) {
      return new NextResponse("Your access has been suspended.", { status: 403 });
    }
  }

  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  if (isAdminRoute) {
    const session = req.auth;
    if (!session?.user?.isAdmin) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)"],
};
