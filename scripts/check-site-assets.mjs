#!/usr/bin/env node

const target = process.argv[2]?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://127.0.0.1:3000";
const site = new URL(target);

function collectAssetUrls(html) {
  const assetUrls = new Set();
  const patterns = [
    /<script[^>]+src="([^"]+)"/g,
    /<link[^>]+href="([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const href = match[1];
      if (!href.startsWith("/_next/static/")) {
        continue;
      }

      assetUrls.add(new URL(href, site).toString());
    }
  }

  return [...assetUrls];
}

async function fetchText(url) {
  const response = await fetch(url, { redirect: "follow" });
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    text: await response.text(),
  };
}

async function fetchHead(url) {
  const response = await fetch(url, { method: "HEAD", redirect: "follow" });
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
  };
}

const home = await fetchText(site.toString());

if (!home.ok) {
  console.error(`Homepage check failed: ${home.status} ${site}`);
  process.exit(1);
}

const assetUrls = collectAssetUrls(home.text);
const failures = [];

for (const assetUrl of assetUrls) {
  const result = await fetchHead(assetUrl);
  const pathname = new URL(assetUrl).pathname;
  const looksLikeJs = pathname.endsWith(".js");
  const looksLikeCss = pathname.endsWith(".css");
  const badJsMime = looksLikeJs && !result.contentType.includes("javascript");
  const badCssMime = looksLikeCss && !result.contentType.includes("css");

  if (!result.ok || badJsMime || badCssMime) {
    failures.push({
      assetUrl,
      status: result.status,
      contentType: result.contentType,
    });
  }
}

if (failures.length > 0) {
  console.error(`Asset check failed for ${failures.length} file(s) on ${site.origin}:`);
  for (const failure of failures) {
    console.error(`- ${failure.status} ${failure.contentType || "-"} ${failure.assetUrl}`);
  }
  process.exit(1);
}

console.log(`Asset check passed for ${assetUrls.length} static asset(s) on ${site.origin}.`);
