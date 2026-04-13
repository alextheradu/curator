import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const chakraTheme = extendTheme({
  config,
  colors: {
    frc: { blue: "#1565C0", red: "#E53935", yellow: "#FFD600" },
    brand: {
      50: "#E3F0FF", 100: "#B3D0FF",
      500: "#1565C0", 600: "#0D47A1", 900: "#061028",
    },
  },
  fonts: {
    heading: "Inter, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
  styles: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global: (props: any) => ({
      body: {
        bg: props.colorMode === "dark" ? "#0A0A0F" : "#F5F5FA",
        color: props.colorMode === "dark" ? "#F0F0FF" : "#0D0D1A",
      },
    }),
  },
});
