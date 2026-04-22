import type { NextRequest } from "next/server";

export function getClientIp(req: NextRequest | Request) {
  // cf-connecting-ip, x-real-ip are set by trusted CDN/proxy layers, not spoofable by clients.
  // Prioritize these over x-forwarded-for which clients can prepend arbitrary values to.
  const trusted =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-vercel-forwarded-for")?.split(",").at(-1)?.trim();

  if (trusted) return trusted;

  // x-forwarded-for: take the rightmost entry, appended by the nearest upstream proxy.
  // The leftmost entries are client-controlled and must not be trusted.
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",").at(-1)?.trim() ?? "unknown";
}

export function getUserAgent(req: NextRequest | Request) {
  return req.headers.get("user-agent") ?? "unknown";
}
