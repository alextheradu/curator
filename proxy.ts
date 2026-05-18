import { auth } from "@/auth";
import { withSystemDbAccess } from "@/lib/db/access";
import { bannedEmails } from "@/lib/db/schema";
import { NO_INDEX_X_ROBOTS_TAG } from "@/lib/seo";
import { buildCsp } from "@/lib/security-headers";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function shouldNoIndex(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/c/")
  );
}

function applyCrawlerHeaders(pathname: string, response: NextResponse) {
  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", NO_INDEX_X_ROBOTS_TAG);
  }

  return response;
}

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const email = req.auth?.user?.email?.toLowerCase();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  if (email) {
    const [ban] = await withSystemDbAccess((tx) => tx
      .select({ email: bannedEmails.email })
      .from(bannedEmails)
      .where(eq(bannedEmails.email, email))
      .limit(1));

    if (ban) {
      return applySecurityHeaders(
        applyCrawlerHeaders(pathname, new NextResponse("Your access has been suspended.", { status: 403 })),
        nonce,
      );
    }
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminRoute) {
    const session = req.auth;
    if (!session?.user?.isAdmin) {
      const response = pathname.startsWith("/api/")
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : NextResponse.redirect(new URL("/", req.url));
      return applySecurityHeaders(applyCrawlerHeaders(pathname, response), nonce);
    }
  }

  return applySecurityHeaders(
    applyCrawlerHeaders(pathname, NextResponse.next({ request: { headers: requestHeaders } })),
    nonce,
  );
});

export const config = {
  matcher: ["/((?!api/auth|api/admin/documents/upload|_events|_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)"],
};
