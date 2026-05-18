type SameSitePolicy = "Lax" | "Strict" | "None";

type SerializeCookieOptions = {
  maxAge?: number;
  path?: string;
  sameSite?: SameSitePolicy;
  secure?: boolean;
  httpOnly?: boolean;
};

const DEFAULT_PATH = "/";
const DEFAULT_SAME_SITE: SameSitePolicy = "Lax";

export function serializeCookie(
  name: string,
  value: string,
  options: SerializeCookieOptions = {},
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? DEFAULT_PATH}`,
    `SameSite=${options.sameSite ?? DEFAULT_SAME_SITE}`,
  ];

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  const shouldUseSecure = options.secure ?? process.env.NODE_ENV === "production";
  if (shouldUseSecure) {
    parts.push("Secure");
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  return parts.join("; ");
}

export function readCookieValue(cookieHeader: string | undefined | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) {
      continue;
    }

    const value = trimmed.slice(name.length + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function readBrowserCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

  return readCookieValue(document.cookie, name);
}

export function deleteCookie(name: string, options: Omit<SerializeCookieOptions, "maxAge"> = {}) {
  return serializeCookie(name, "", { ...options, maxAge: 0 });
}
