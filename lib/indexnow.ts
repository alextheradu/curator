import { SITE_URL } from "@/lib/site";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

type IndexNowResult =
  | {
      ok: true;
      status: number;
      body: string;
      submitted: string[];
    }
  | {
      ok: false;
      status?: number;
      body?: string;
      skipped: true;
      reason: string;
      submitted: string[];
    };

export function getIndexNowKey() {
  return process.env.INDEXNOW_KEY?.trim() ?? "";
}

export function getIndexNowKeyLocation() {
  return new URL(INDEXNOW_KEY_PATH, SITE_URL).toString();
}

export function getIndexNowDefaultPublicUrls() {
  return [
    SITE_URL,
    new URL("/privacy-policy", SITE_URL).toString(),
    new URL("/terms-of-service", SITE_URL).toString(),
    new URL("/support", SITE_URL).toString(),
    new URL("/llms.txt", SITE_URL).toString(),
  ];
}

function normalizeUrl(value: string) {
  try {
    return new URL(value, SITE_URL);
  } catch {
    return null;
  }
}

function isIndexableUrl(url: URL) {
  const site = new URL(SITE_URL);

  if (url.origin !== site.origin) return false;

  return !(
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/c/")
  );
}

export async function submitIndexNowUrls(urls: string[]): Promise<IndexNowResult> {
  const key = getIndexNowKey();
  const site = new URL(SITE_URL);

  if (!key) {
    return {
      ok: false,
      skipped: true,
      reason: "INDEXNOW_KEY is not configured.",
      submitted: [],
    };
  }

  if (site.hostname === "localhost" || site.hostname === "127.0.0.1") {
    return {
      ok: false,
      skipped: true,
      reason: "SITE_URL must point to a public hostname before submitting IndexNow URLs.",
      submitted: [],
    };
  }

  const submitted = [
    ...new Set(
      urls
        .map(normalizeUrl)
        .filter((url): url is URL => url !== null)
        .filter(isIndexableUrl)
        .map((url) => url.toString()),
    ),
  ].slice(0, 10_000);

  if (!submitted.length) {
    return {
      ok: false,
      skipped: true,
      reason: "No eligible public URLs were provided.",
      submitted: [],
    };
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host: site.host,
      key,
      keyLocation: getIndexNowKeyLocation(),
      urlList: submitted,
    }),
  });

  const body = (await response.text()).trim();

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body,
      skipped: true,
      reason: `IndexNow rejected the submission with HTTP ${response.status}.`,
      submitted,
    };
  }

  return {
    ok: true,
    status: response.status,
    body,
    submitted,
  };
}
