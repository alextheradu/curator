import { auth } from "@/auth";
import { withSystemDbAccess } from "@/lib/db/access";
import { bannedEmails } from "@/lib/db/schema";
import { NO_INDEX_X_ROBOTS_TAG } from "@/lib/seo";
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

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const email = req.auth?.user?.email?.toLowerCase();

  if (email) {
    const [ban] = await withSystemDbAccess((tx) => tx
      .select({ email: bannedEmails.email })
      .from(bannedEmails)
      .where(eq(bannedEmails.email, email))
      .limit(1));

    if (ban) {
      return applyCrawlerHeaders(pathname, new NextResponse("Your access has been suspended.", { status: 403 }));
    }
  }

  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) {
    const session = req.auth;
    if (!session?.user?.isAdmin) {
      return applyCrawlerHeaders(pathname, NextResponse.redirect(new URL("/", req.url)));
    }
  }

  return applyCrawlerHeaders(pathname, NextResponse.next());
});

export const config = {
  matcher: ["/((?!api/auth|_events|_next/static|_next/image|favicon.ico|icon.png|icon.svg).*)"],
};
