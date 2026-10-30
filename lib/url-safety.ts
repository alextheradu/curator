import { SITE_URL } from "@/lib/site";

const SENSITIVE_QUERY_PARAMS = new Set([
  "prompt",
  "token",
  "code",
  "state",
  "session",
  "secret",
  "password",
  "key",
]);

export function sanitizeReturnHref(value: unknown, fallback = "/") {
  if (typeof value !== "string" || !value) return fallback;

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(decoded, "https://curator.local");
    if (url.origin !== "https://curator.local") return fallback;

    // Validate the *normalized* path as well as the raw input. Dot-segment
    // removal can turn "/.//evil.example" or "/x/..//evil.example" into a
    // pathname of "//evil.example", which browsers and the Next router treat
    // as a protocol-relative URL to another host. Backslashes are also
    // normalized to slashes for special schemes, so "/\evil.example" ends up
    // the same way.
    if (url.pathname.startsWith("//") || url.pathname.startsWith("/\\")) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function sanitizeClientLogUrl(value: unknown) {
  if (typeof value !== "string" || !value) return "/";

  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) {
    return "/";
  }

  let url: URL;
  try {
    url = new URL(value, "https://curator.local");
  } catch {
    return "/";
  }

  const siteOrigin = new URL(SITE_URL).origin;
  if (url.origin !== "https://curator.local" && url.origin !== siteOrigin && url.origin !== "https://curatorfrc.com") {
    return "/";
  }

  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) {
      url.searchParams.set(key, "[redacted]");
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
