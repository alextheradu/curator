import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "250mb",
  },
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
