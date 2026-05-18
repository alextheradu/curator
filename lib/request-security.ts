import { NextRequest, NextResponse } from "next/server";

function isMutatingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function getAllowedOrigin(req: NextRequest) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.AUTH_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      return req.nextUrl.origin;
    }
  }

  return req.nextUrl.origin;
}

export function hasValidMutationOrigin(req: NextRequest) {
  if (!isMutatingMethod(req.method)) return true;

  const origin = req.headers.get("origin");
  if (origin) {
    return origin === getAllowedOrigin(req);
  }

  const secFetchSite = req.headers.get("sec-fetch-site");
  return secFetchSite === "same-origin" || secFetchSite === "none";
}

export function hasJsonContentType(req: Request) {
  const contentType = req.headers.get("content-type");
  return typeof contentType === "string" && contentType.toLowerCase().includes("application/json");
}

export function validateJsonMutationRequest(req: NextRequest | Request) {
  if (req instanceof NextRequest && !hasValidMutationOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasJsonContentType(req)) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  return null;
}
