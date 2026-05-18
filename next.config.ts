import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { getSentryReleaseManagementConfig } from "./lib/sentry";
import { securityHeaders } from "./lib/security-headers";

const appBuildId =
  process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim()
  || process.env.VERCEL_GIT_COMMIT_SHA?.trim()
  || process.env.SENTRY_RELEASE?.trim()
  || `${Date.now()}`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.curatorfrc.com"],
  env: {
    NEXT_PUBLIC_APP_BUILD_ID: appBuildId,
  },
  experimental: {
    proxyClientMaxBodySize: "2mb",
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
