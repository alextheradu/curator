import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.curatorfrc.app",
  appName: "Curator",
  webDir: "public",
  server: {
    url: "https://curatorfrc.com",
    cleartext: false,
  },
  ios: {
    backgroundColor: "#0f0f0f",
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      // Web client ID — makes the returned idToken verifiable server-side with AUTH_GOOGLE_ID
      serverClientId: process.env.AUTH_GOOGLE_ID ?? "",
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
