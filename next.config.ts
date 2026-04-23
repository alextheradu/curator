import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { getSentryReleaseManagementConfig, getSentryTunnelPath } from "./lib/sentry";

const appBuildId =
  process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim()
  || process.env.VERCEL_GIT_COMMIT_SHA?.trim()
  || process.env.SENTRY_RELEASE?.trim()
  || `${Date.now()}`;

function buildCsp(): string {
  const minioEndpoint = process.env.MINIO_ENDPOINT?.trim() ?? "";
  let minioOrigin = "";
  try {
    if (minioEndpoint.startsWith("http://") || minioEndpoint.startsWith("https://")) {
      minioOrigin = new URL(minioEndpoint).origin;
    }
  } catch {
    // ignore
  }

  const frameSrc = ["'self'", minioOrigin].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://static.cloudflareinsights.com",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
    `frame-src ${frameSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: buildCsp() },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/blog", destination: "/news", permanent: true },
      { source: "/blog/:slug", destination: "/news/:slug", permanent: true },
    ];
  },
};

const sentryReleaseManagement = getSentryReleaseManagementConfig();

export default withSentryConfig(nextConfig, {
  org: sentryReleaseManagement.org || undefined,
  project: sentryReleaseManagement.project || undefined,
  authToken: sentryReleaseManagement.authToken || undefined,
  widenClientFileUpload: sentryReleaseManagement.enabled,
  tunnelRoute: getSentryTunnelPath(),
  silent: !process.env.CI,
  sourcemaps: {
    disable: !sentryReleaseManagement.enabled,
    deleteSourcemapsAfterUpload: sentryReleaseManagement.enabled,
  },
  webpack: {
    disableSentryConfig: !sentryReleaseManagement.enabled,
    treeshake: {
      removeDebugLogging: true,
    },
    unstable_sentryWebpackPluginOptions: {
      disable: !sentryReleaseManagement.enabled,
    },
  },
});
