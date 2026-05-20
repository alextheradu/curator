// leftover. tailwind + globals.css does all of this now, this file isn't loaded.

export const muiDarkTheme = {
  palette: {
    mode: "dark" as const,
    primary: { main: "#1565C0" },
    secondary: { main: "#E53935" },
    background: { default: "#0A0A0F", paper: "#12121A" },
    text: { primary: "#F0F0FF", secondary: "#8B8BA7" },
  },
};

export const muiLightTheme = {
  palette: {
    mode: "light" as const,
    primary: { main: "#1565C0" },
    secondary: { main: "#E53935" },
    background: { default: "#F5F5FA", paper: "#FFFFFF" },
    text: { primary: "#0D0D1A", secondary: "#5A5A7A" },
  },
};
