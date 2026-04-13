import { createTheme } from "@mui/material/styles";

export const muiDarkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#1565C0" },
    secondary: { main: "#E53935" },
    background: { default: "#0A0A0F", paper: "#12121A" },
    text: { primary: "#F0F0FF", secondary: "#8B8BA7" },
  },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
  components: {
    MuiList: { styleOverrides: { root: { padding: 0 } } },
    MuiListItem: {
      styleOverrides: {
        root: { borderRadius: "8px", "&:hover": { backgroundColor: "#1E1E2E" } },
      },
    },
    MuiSelect: {
      styleOverrides: { root: { fontSize: "0.875rem", color: "#F0F0FF" } },
    },
  },
});

export const muiLightTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1565C0" },
    secondary: { main: "#E53935" },
    background: { default: "#F5F5FA", paper: "#FFFFFF" },
    text: { primary: "#0D0D1A", secondary: "#5A5A7A" },
  },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
  components: {
    MuiList: { styleOverrides: { root: { padding: 0 } } },
    MuiListItem: {
      styleOverrides: {
        root: { borderRadius: "8px", "&:hover": { backgroundColor: "#E8EAFF" } },
      },
    },
  },
});
