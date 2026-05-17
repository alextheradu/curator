import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

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
      resize: KeyboardResize.None,
    },
  },
};

export default config;
