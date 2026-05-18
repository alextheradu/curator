export function buildCsp(nonce?: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const minioEndpoint = process.env.MINIO_ENDPOINT?.trim() ?? "";
  let minioOrigin = "";
  try {
    if (minioEndpoint.startsWith("http://") || minioEndpoint.startsWith("https://")) {
      minioOrigin = new URL(minioEndpoint).origin;
    }
  } catch {
    // Ignore invalid optional MinIO endpoint values at config time.
  }

  const frameSrc = ["'self'", minioOrigin].filter(Boolean).join(" ");
  const scriptNonce = nonce ? ` 'nonce-${nonce}'` : "";
  const styleNonce = nonce ? ` 'nonce-${nonce}'` : "";
  const scriptSrcExtras = isDev ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self' capacitor://localhost",
    `script-src 'self'${scriptNonce}${scriptSrcExtras} capacitor://localhost https://www.googletagmanager.com https://static.cloudflareinsights.com`,
    "worker-src 'self' blob:",
    `style-src 'self'${styleNonce}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https: capacitor://localhost",
    "font-src 'self' capacitor://localhost",
    "connect-src 'self' capacitor://localhost https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
    `frame-src ${frameSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), browsing-topics=(), usb=(), bluetooth=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
