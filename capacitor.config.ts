import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.curatorfrc.app",
  appName: "Curator",
  webDir: "public",
  server: {
    url: "https://curatorfrc.com",
    cleartext: false,
    allowNavigation: ["curatorfrc.com", "*.curatorfrc.com"],
  },
  ios: {
    backgroundColor: "#0f0f0f",
    allowsLinkPreview: false,
    scrollEnabled: false,
  },
  plugins: {
    Keyboard: {
      accessoryBarVisible: false,
      resize: "none",
    },
  },
};

export default config;
