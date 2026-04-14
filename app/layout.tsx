import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Curator — FRC AI Knowledge Base",
  description: "AI-powered assistant for FIRST Robotics Competition. Ask about rules, strategy, programming, and more.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Curator — FRC AI Knowledge Base",
    description: "Ask about FRC rules, game manuals, strategy, and programming.",
    siteName: "Curator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Curator — FRC AI Knowledge Base",
    description: "Ask about FRC rules, game manuals, strategy, and programming.",
  },
};

export const viewport: Viewport = {
  themeColor: "#ED1C24",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} dark`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
