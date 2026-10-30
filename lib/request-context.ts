import type { NextRequest } from "next/server";

// Headers whose value is taken as the client IP verbatim. Only a header that
// the proxy in front of this app always *overwrites* belongs here; any header
// the proxy merely forwards can be set by the client and used to spoof the
// per-IP rate-limit keys. Default: Cloudflare's cf-connecting-ip (production
// sits behind Cloudflare). Override with TRUSTED_CLIENT_IP_HEADERS (comma
// separated; empty string trusts none and falls back to x-forwarded-for).
const DEFAULT_TRUSTED_CLIENT_IP_HEADERS = ["cf-connecting-ip"];

function getTrustedClientIpHeaders() {
  const raw = process.env.TRUSTED_CLIENT_IP_HEADERS;
  if (raw === undefined) return DEFAULT_TRUSTED_CLIENT_IP_HEADERS;
  return raw
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
}

export function getClientIp(req: NextRequest | Request) {
  for (const header of getTrustedClientIpHeaders()) {
    const value = req.headers.get(header)?.trim();
    if (value) return value;
  }

  // x-forwarded-for: take the rightmost entry, appended by the nearest upstream proxy.
  // The leftmost entries are client-controlled and must not be trusted.
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",").at(-1)?.trim() || "unknown";
}

export function getUserAgent(req: NextRequest | Request) {
  return req.headers.get("user-agent") ?? "unknown";
}
