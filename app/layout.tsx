import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
