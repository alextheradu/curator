"use client";

import { ReactNode } from "react";
import { ThemeProvider as MUIThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider as NextThemeProvider, useTheme } from "next-themes";
import { chakraTheme } from "@/lib/theme/chakra-theme";
import { muiDarkTheme, muiLightTheme } from "@/lib/theme/mui-theme";

function MUIWrapper({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? muiDarkTheme : muiLightTheme;
  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ChakraProvider theme={chakraTheme}>
        <MUIWrapper>{children}</MUIWrapper>
      </ChakraProvider>
    </NextThemeProvider>
  );
}
