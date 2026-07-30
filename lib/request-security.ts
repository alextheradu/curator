import { NextRequest, NextResponse } from "next/server";

function isMutatingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function getRequestOrigin(req: NextRequest | Request) {
  // Avoid instanceof: in production bundles the route's NextRequest class can
  // be a different module instance, which silently fails instanceof checks.
  if ("nextUrl" in req) {
    return (req as NextRequest).nextUrl.origin;
  }

  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

function getAllowedOrigin(req: NextRequest | Request) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.AUTH_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return getRequestOrigin(req);
    }
  }

  return getRequestOrigin(req);
}

export function hasValidMutationOrigin(
  req: NextRequest | Request,
  options?: { requireOriginHeader?: boolean },
) {
  if (!isMutatingMethod(req.method)) return true;

  const origin = req.headers.get("origin");
  if (origin) {
    return origin === getAllowedOrigin(req);
  }

  // Strict callers (admin routes) reject mutations without an Origin header
  // instead of falling back to Sec-Fetch-Site.
  if (options?.requireOriginHeader) return false;

  const secFetchSite = req.headers.get("sec-fetch-site");
  return secFetchSite === "same-origin" || secFetchSite === "none";
}

export function hasJsonContentType(req: Request) {
  const contentType = req.headers.get("content-type");
  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
}

export function validateJsonMutationRequest(req: NextRequest | Request) {
  if (!hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  return null;
}
