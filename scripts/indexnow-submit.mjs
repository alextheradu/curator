#!/usr/bin/env node

import nextEnv from "@next/env";

const DEFAULT_DEVELOPMENT_SITE_URL = "http://localhost:3000";
const DEFAULT_PRODUCTION_SITE_URL = "https://curatorfrc.com";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

function resolveSiteUrl() {
  const candidates = [
    process.env.INDEXNOW_SITE_URL?.trim(),
    process.env.AUTH_URL?.trim(),
    process.env.NEXT_PUBLIC_SITE_URL?.trim(),
  ].filter(Boolean);

  for (const raw of candidates) {
    try {
      const parsed = new URL(raw);
      const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (!isLocalhost) {
        return parsed.origin;
      }
    } catch {
      // Ignore invalid values and keep scanning.
    }
  }

  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    return process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_SITE_URL
      : DEFAULT_DEVELOPMENT_SITE_URL;
  }

  try {
    const parsed = new URL(raw);
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (process.env.NODE_ENV === "production" && isLocalhost) {
      return DEFAULT_PRODUCTION_SITE_URL;
    }

    return parsed.origin;
  } catch {
    return process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_SITE_URL
      : DEFAULT_DEVELOPMENT_SITE_URL;
  }
}

function defaultPublicUrls(siteUrl) {
  return [
    siteUrl,
    new URL("/privacy-policy", siteUrl).toString(),
    new URL("/terms-of-service", siteUrl).toString(),
    new URL("/support", siteUrl).toString(),
    new URL("/llms.txt", siteUrl).toString(),
  ];
}

function normalizeUrl(value, siteUrl) {
  try {
    return new URL(value, siteUrl);
  } catch {
    return null;
  }
}

const siteUrl = resolveSiteUrl();
const site = new URL(siteUrl);
const key = process.env.INDEXNOW_KEY?.trim();
const rawArgs = process.argv.slice(2);

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log("Usage: npm run indexnow:submit -- [url-or-path ...]");
  console.log("Without arguments, submits the site's current public URLs.");
  process.exit(0);
}

const unknownFlags = rawArgs.filter((arg) => arg.startsWith("-"));
if (unknownFlags.length) {
  console.error(`Unknown option${unknownFlags.length === 1 ? "" : "s"}: ${unknownFlags.join(", ")}`);
  process.exit(1);
}

if (!key) {
  console.error("Missing INDEXNOW_KEY. Add it to .env or .env.local first.");
  process.exit(1);
}

if (site.hostname === "localhost" || site.hostname === "127.0.0.1") {
  console.error("Refusing to submit IndexNow URLs for a localhost site URL.");
  process.exit(1);
}

const cliUrls = rawArgs;
const urlList = [...new Set((cliUrls.length ? cliUrls : defaultPublicUrls(siteUrl))
  .map((value) => normalizeUrl(value, siteUrl))
  .filter((value) => value !== null)
  .filter((value) => value.origin === site.origin)
  .filter((value) => !value.pathname.startsWith("/admin"))
  .filter((value) => !value.pathname.startsWith("/api/"))
  .filter((value) => !value.pathname.startsWith("/c/"))
  .map((value) => value.toString()))].slice(0, 10_000);

if (!urlList.length) {
  console.error("No eligible public URLs to submit.");
  process.exit(1);
}

const response = await fetch(INDEXNOW_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify({
    host: site.host,
    key,
    keyLocation: new URL(INDEXNOW_KEY_PATH, siteUrl).toString(),
    urlList,
  }),
});

const body = (await response.text()).trim();

if (!response.ok) {
  console.error(`IndexNow submission failed with HTTP ${response.status}.`);
  if (body) console.error(body);
  process.exit(1);
}

console.log(`Submitted ${urlList.length} URL${urlList.length === 1 ? "" : "s"} to IndexNow.`);
console.log(`Endpoint: ${INDEXNOW_ENDPOINT}`);
console.log(`Key file: ${new URL(INDEXNOW_KEY_PATH, siteUrl).toString()}`);
if (body) console.log(body);
