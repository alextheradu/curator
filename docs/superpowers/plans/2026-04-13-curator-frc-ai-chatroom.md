# Curator — FRC AI Chatroom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Curator" — a sleek, semi-futuristic FRC-focused AI chatroom using Next.js 14+, OpenRouter (Gemma 3 27B), shadcn/ui + MUI + Chakra UI, with streaming responses, dark/light mode, and FIRST Design Language aesthetics.

**Architecture:** Single-page chat app with a collapsible left sidebar (conversation history), a main chat window (streaming MessageBubbles), and a bottom InputBar. All chat state lives in Zustand. The `/api/chat` route proxies to OpenRouter with native ReadableStream SSE. Framer Motion drives all animations.

**Tech Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · MUI · Chakra UI · Zustand · Framer Motion · react-markdown + react-syntax-highlighter · OpenRouter API

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/layout.tsx` | Root layout: ChakraProvider → MUI ThemeProvider → fonts |
| `app/page.tsx` | Main chat page: composes Sidebar + ChatWindow |
| `app/globals.css` | CSS custom properties, Tailwind base, circuit-board texture |
| `app/api/chat/route.ts` | Streaming proxy to OpenRouter |
| `components/sidebar/Sidebar.tsx` | Collapsible sidebar: branding, new chat, history list |
| `components/sidebar/ConversationItem.tsx` | MUI ListItem for a single history entry |
| `components/chat/ChatWindow.tsx` | Message list container + auto-scroll logic |
| `components/chat/MessageBubble.tsx` | User/AI bubble with markdown, code, citation rendering |
| `components/chat/InputBar.tsx` | Auto-expanding textarea, send button, disclaimer |
| `components/chat/StreamingIndicator.tsx` | Animated chevron-dot typing indicator |
| `components/chat/EmptyState.tsx` | Logo + 6 starter prompt chips |
| `components/ui/SeasonSelector.tsx` | MUI Select for FRC season year (2023–2025) |
| `components/ui/CitationBadge.tsx` | Styled badge chip for source references |
| `components/ui/SettingsModal.tsx` | Chakra Modal: API key input + temperature slider |
| `components/ui/ThemeToggle.tsx` | Dark/light toggle with Framer spring animation |
| `components/PageTransition.tsx` | Framer Motion page fade-in wrapper |
| `components/Providers.tsx` | All providers composed together (client component) |
| `lib/frc-system-prompt.ts` | Full anti-hallucination system prompt constant |
| `lib/openrouter.ts` | OpenRouter fetch client helper |
| `lib/store.ts` | Zustand store: conversations, messages, UI state |
| `lib/utils.ts` | cn() helper, citation parser, token estimator |
| `lib/theme/mui-theme.ts` | MUI dark + light theme objects |
| `lib/theme/chakra-theme.ts` | Chakra extended theme |
| `hooks/useAutoScroll.ts` | Auto-scroll-to-bottom with user-scroll-pause |
| `hooks/useLocalStorage.ts` | Typed localStorage hook |
| `.env.local` | OPENROUTER_API_KEY, NEXT_PUBLIC_SITE_URL |

---

## Task 1: Project Scaffold + Dependencies

**Files:**
- Create: `package.json` (via npx)
- Create: `.env.local`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json` (via scaffold)

- [ ] **Step 1: Scaffold Next.js 14 project**

```bash
cd /srv/md0/robotics/curator
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-git
```

Expected output: "Success! Created curator at ..."

- [ ] **Step 2: Install all UI + animation dependencies**

```bash
npm install \
  @mui/material @mui/icons-material @emotion/react @emotion/styled \
  @chakra-ui/react @chakra-ui/icons \
  framer-motion \
  zustand \
  react-markdown remark-gfm rehype-highlight \
  react-syntax-highlighter \
  @types/react-syntax-highlighter \
  lucide-react \
  clsx tailwind-merge \
  next-themes \
  tailwindcss-animate
```

Expected: clean install, no peer dep errors.

- [ ] **Step 3: Install shadcn/ui CLI and init**

```bash
npx shadcn@latest init --defaults
```

When prompted: style=Default, base color=Slate, CSS variables=yes.

- [ ] **Step 4: Add shadcn components used in the app**

```bash
npx shadcn@latest add button textarea badge toast scroll-area dialog slider
```

- [ ] **Step 5: Create .env.local**

Create `/srv/md0/robotics/curator/.env.local` with this content:
```
OPENROUTER_API_KEY=your_key_here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: server running at http://localhost:3000 with no errors.

- [ ] **Step 7: Commit scaffold**

```bash
git init && git add -A
git commit -m "chore: scaffold Next.js 14 + install all dependencies"
```

---

## Task 2: Tailwind Config + CSS Custom Properties

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Update tailwind.config.ts with FIRST design tokens**

Replace the contents of `tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "frc-blue": "#1565C0",
        "frc-red": "#E53935",
        "frc-yellow": "#FFD600",
        "surface": "#0A0A0F",
        "surface-elevated": "#12121A",
        "surface-border": "#1E1E2E",
        "text-primary": "#F0F0FF",
        "text-muted": "#8B8BA7",
        "success": "#00C853",
        "warning": "#FF6D00",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #1565C040" },
          "100%": { boxShadow: "0 0 20px #1565C080, 0 0 40px #1565C030" },
        },
      },
      backgroundImage: {
        "frc-gradient": "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
        "ai-gradient": "linear-gradient(135deg, #12121A 0%, #1a1a2e 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

- [ ] **Step 2: Replace app/globals.css with full theme CSS**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 14% 96%;
    --foreground: 224 71% 4%;
    --card: 0 0% 100%;
    --card-foreground: 224 71% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 224 71% 4%;
    --primary: 217 72% 41%;
    --primary-foreground: 210 40% 98%;
    --secondary: 0 73% 57%;
    --secondary-foreground: 0 0% 100%;
    --muted: 220 14% 90%;
    --muted-foreground: 220 9% 46%;
    --accent: 48 100% 50%;
    --accent-foreground: 224 71% 4%;
    --border: 220 13% 85%;
    --input: 220 13% 85%;
    --ring: 217 72% 41%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 15% 4%;
    --foreground: 240 10% 95%;
    --card: 240 15% 7%;
    --card-foreground: 240 10% 95%;
    --popover: 240 15% 7%;
    --popover-foreground: 240 10% 95%;
    --primary: 217 72% 41%;
    --primary-foreground: 210 40% 98%;
    --secondary: 0 73% 57%;
    --secondary-foreground: 0 0% 100%;
    --muted: 240 10% 16%;
    --muted-foreground: 240 5% 55%;
    --accent: 48 100% 50%;
    --accent-foreground: 240 15% 4%;
    --border: 240 10% 12%;
    --input: 240 10% 12%;
    --ring: 217 72% 41%;
  }

  * {
    @apply border-border;
    scrollbar-width: thin;
    scrollbar-color: #1E1E2E transparent;
  }

  body {
    @apply bg-background text-foreground font-sans;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1E1E2E; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #2E2E4E; }
}

/* Circuit board sidebar texture via inline SVG data URI */
.circuit-bg {
  position: relative;
}
.circuit-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231565C0' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
  border-radius: inherit;
}

/* Futuristic scan-line effect on chat header */
.scanline {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(21, 101, 192, 0.03) 2px,
    rgba(21, 101, 192, 0.03) 4px
  );
}

/* Glowing border on active input */
.input-glow:focus-within {
  box-shadow: 0 0 0 1px #1565C060, 0 0 20px #1565C020;
}
```

- [ ] **Step 3: Verify Tailwind picks up config**

```bash
npm run build 2>&1 | head -20
```

Expected: No Tailwind config errors.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css package.json package-lock.json
git commit -m "chore: configure Tailwind with FIRST design tokens + CSS vars"
```

---

## Task 3: Root Layout — Provider Setup + Fonts

**Files:**
- Create: `lib/theme/mui-theme.ts`
- Create: `lib/theme/chakra-theme.ts`
- Create: `components/Providers.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create MUI theme**

Create `lib/theme/mui-theme.ts`:

```typescript
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
```

- [ ] **Step 2: Create Chakra theme**

Create `lib/theme/chakra-theme.ts`:

```typescript
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
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === "dark" ? "#0A0A0F" : "#F5F5FA",
        color: props.colorMode === "dark" ? "#F0F0FF" : "#0D0D1A",
      },
    }),
  },
});
```

- [ ] **Step 3: Create Providers client component**

Create `components/Providers.tsx`:

```typescript
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
```

- [ ] **Step 4: Write app/layout.tsx**

```typescript
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Curator — Your FIRST Robotics Assistant",
  description: "AI-powered FRC assistant. Ask anything about FIRST Robotics Competition.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Test build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx components/Providers.tsx lib/theme/
git commit -m "feat: set up MUI + Chakra + next-themes providers in root layout"
```

---

## Task 4: Zustand Store + Utilities

**Files:**
- Create: `lib/store.ts`
- Create: `lib/utils.ts`

- [ ] **Step 1: Write lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Estimate token count: ~1 token per 4 chars */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Parse citation patterns from AI response text.
 * Matches: "Per the 2025 Game Manual Section 4.3" or "Per WPILib docs"
 */
export function parseCitations(text: string): string[] {
  const pattern = /Per (?:the )?([^.]+(?:Manual|docs?|documentation|Section)[^.]*)\./gi;
  const citations: string[] = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    citations.push(match[1].trim());
  }
  return [...new Set(citations)];
}

/** Generate a short title from the first user message */
export function generateChatTitle(firstMessage: string): string {
  const words = firstMessage.trim().split(/\s+/).slice(0, 6);
  return words.join(" ") + (firstMessage.split(/\s+/).length > 6 ? "…" : "");
}

export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}
```

- [ ] **Step 2: Write lib/store.ts**

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateChatTitle } from "./utils";

export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  citations?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  seasonYear: number;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  streamingContent: string;
  isStreaming: boolean;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  temperature: number;
  apiKeyOverride: string;

  newConversation: () => string;
  setActiveConversation: (id: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => string;
  updateStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (conversationId: string) => void;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  setSeasonYear: (conversationId: string, year: number) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setTemperature: (temp: number) => void;
  setApiKeyOverride: (key: string) => void;
  activeConversation: () => Conversation | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      streamingContent: "",
      isStreaming: false,
      sidebarOpen: true,
      settingsOpen: false,
      temperature: 0.2,
      apiKeyOverride: "",

      newConversation: () => {
        const id = crypto.randomUUID();
        const conversation: Conversation = {
          id, title: "New Chat", messages: [],
          createdAt: new Date(), updatedAt: new Date(), seasonYear: 2025,
        };
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          activeConversationId: id,
          streamingContent: "",
          isStreaming: false,
        }));
        return id;
      },

      setActiveConversation: (id) =>
        set({ activeConversationId: id, streamingContent: "", isStreaming: false }),

      addMessage: (conversationId, message) => {
        const id = crypto.randomUUID();
        const fullMessage: Message = { ...message, id, timestamp: new Date() };
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages, fullMessage];
            const title =
              c.title === "New Chat" && message.role === "user"
                ? generateChatTitle(message.content)
                : c.title;
            return { ...c, messages, title, updatedAt: new Date() };
          }),
        }));
        return id;
      },

      updateStreamingContent: (content) =>
        set({ streamingContent: content, isStreaming: true }),

      finalizeStreamingMessage: (conversationId) => {
        const { streamingContent } = get();
        if (!streamingContent) return;
        const message: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: streamingContent,
          timestamp: new Date(),
        };
        set((s) => ({
          streamingContent: "",
          isStreaming: false,
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [...c.messages, message], updatedAt: new Date() }
              : c
          ),
        }));
      },

      clearConversation: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, messages: [], title: "New Chat", updatedAt: new Date() }
              : c
          ),
          streamingContent: "",
          isStreaming: false,
        })),

      deleteConversation: (conversationId) =>
        set((s) => {
          const remaining = s.conversations.filter((c) => c.id !== conversationId);
          return {
            conversations: remaining,
            activeConversationId:
              s.activeConversationId === conversationId
                ? (remaining[0]?.id ?? null)
                : s.activeConversationId,
          };
        }),

      setSeasonYear: (conversationId, year) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId ? { ...c, seasonYear: year } : c
          ),
        })),

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setTemperature: (temp) => set({ temperature: temp }),
      setApiKeyOverride: (key) => set({ apiKeyOverride: key }),

      activeConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },
    }),
    {
      name: "curator-chat-store",
      partialize: (s) => ({
        conversations: s.conversations,
        activeConversationId: s.activeConversationId,
        temperature: s.temperature,
        apiKeyOverride: s.apiKeyOverride,
        sidebarOpen: s.sidebarOpen,
      }),
    }
  )
);
```

- [ ] **Step 3: Commit**

```bash
git add lib/store.ts lib/utils.ts
git commit -m "feat: add Zustand chat store with persistence + utility functions"
```

---

## Task 5: FRC System Prompt + OpenRouter Client

**Files:**
- Create: `lib/frc-system-prompt.ts`
- Create: `lib/openrouter.ts`

- [ ] **Step 1: Write lib/frc-system-prompt.ts**

```typescript
export const FRC_SYSTEM_PROMPT = `You are Curator, an expert AI assistant exclusively for FIRST Robotics Competition (FRC). You have deep knowledge of official FRC season materials including:

- Game manuals (Sections 1-12) for all recent seasons (2020-2025)
- FRC field CAD and technical drawings
- Robot rules (R rules), game rules (G rules), and inspection checklists
- WPILib documentation and Java/C++/Python robot programming guides
- FRC vendor documentation: REV Robotics, CTRE Phoenix 6, Kauai Labs NavX, AndyMark, VEX Robotics
- FRC scouting, strategy, and alliance selection guides
- Team management resources from FIRST HQ

STRICT RULES:

1. NEVER speculate or guess. If uncertain, say: "I don't have verified information on that. Please check the official FRC Game Manual at firstinspires.org."

2. ONLY answer questions directly related to FRC: robot building, programming, game strategy, rules, team management, scouting, events, and FIRST programs.

3. If asked about anything outside FRC/FIRST: "I'm Curator, specialized exclusively in FRC. I can't help with that, but I'm happy to answer any FRC-related questions!"

4. Always cite your source (e.g., "Per the 2025 Game Manual Section 4.3..." or "Per WPILib docs...").

5. When rules have changed year-to-year, ask the user to confirm their season year.

6. Do not invent rule numbers, part numbers, dimensions, weight limits, or game mechanics.

7. Format code examples using proper markdown code blocks with language identifiers (java, cpp, python).

8. When referencing rule numbers, include the full rule number (e.g., R401, G301).

Current conversation season year: {{SEASON_YEAR}}`;

export function buildSystemPrompt(seasonYear: number): string {
  return FRC_SYSTEM_PROMPT.replace("{{SEASON_YEAR}}", seasonYear.toString());
}
```

- [ ] **Step 2: Write lib/openrouter.ts**

```typescript
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterStreamOptions {
  messages: ChatMessage[];
  temperature?: number;
  apiKey?: string;
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export async function streamOpenRouterChat({
  messages,
  temperature = 0.2,
  apiKey,
  onToken,
  onDone,
  onError,
  signal,
}: OpenRouterStreamOptions): Promise<void> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, temperature, apiKey }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content ?? "";
          if (token) onToken(token);
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }

    onDone();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/frc-system-prompt.ts lib/openrouter.ts
git commit -m "feat: add FRC system prompt + OpenRouter streaming client"
```

---

## Task 6: API Route — OpenRouter Streaming Proxy

**Files:**
- Create: `app/api/chat/route.ts`

- [ ] **Step 1: Write the streaming edge API route**

Create `app/api/chat/route.ts`:

```typescript
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const { messages, temperature = 0.2 } = await request.json();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const openRouterResponse = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
        "X-Title": "Curator FRC Assistant",
      },
      body: JSON.stringify({
        model: "google/gemma-3-27b-it:free",
        messages,
        stream: true,
        temperature,
        top_p: 0.9,
        max_tokens: 2048,
      }),
    }
  );

  if (!openRouterResponse.ok) {
    const errorText = await openRouterResponse.text();
    let errorMessage = `OpenRouter error ${openRouterResponse.status}`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error?.message ?? errorMessage;
    } catch {}
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: openRouterResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(openRouterResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Manual smoke test (after API key is set)**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is FRC?"}],"temperature":0.2}' \
  --no-buffer | head -20
```

Expected: stream of `data: {...}` SSE lines.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add edge streaming API route proxying to OpenRouter"
```

---

## Task 7: ThemeToggle Component

**Files:**
- Create: `components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Write ThemeToggle with Framer Motion spring animation**

Create `components/ui/ThemeToggle.tsx`:

```typescript
"use client";

import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[52px] h-6" />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex w-[52px] h-6 items-center rounded-full border border-surface-border bg-surface-border/60 transition-colors hover:border-frc-blue/50 focus:outline-none"
      aria-label="Toggle theme"
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ backgroundColor: isDark ? "#1565C020" : "#FFD60020" }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        className="relative z-10 flex items-center justify-center w-5 h-5 rounded-full shadow-sm"
        animate={{
          x: isDark ? 2 : 28,
          backgroundColor: isDark ? "#1565C0" : "#FFD600",
          rotate: isDark ? 0 : 360,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {isDark
          ? <Moon size={11} className="text-white" />
          : <Sun size={11} className="text-gray-800" />
        }
      </motion.div>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/ThemeToggle.tsx
git commit -m "feat: add animated dark/light ThemeToggle with spring physics"
```

---

## Task 8: SeasonSelector + CitationBadge

**Files:**
- Create: `components/ui/SeasonSelector.tsx`
- Create: `components/ui/CitationBadge.tsx`

- [ ] **Step 1: Write SeasonSelector (MUI Select)**

Create `components/ui/SeasonSelector.tsx`:

```typescript
"use client";

import { Select, MenuItem, FormControl } from "@mui/material";
import { useChatStore } from "@/lib/store";

const SEASONS = [2023, 2024, 2025];

interface Props {
  conversationId: string;
  value: number;
}

export function SeasonSelector({ conversationId, value }: Props) {
  const setSeasonYear = useChatStore((s) => s.setSeasonYear);

  return (
    <FormControl size="small" variant="outlined" sx={{ minWidth: 100 }}>
      <Select
        value={value}
        onChange={(e) => setSeasonYear(conversationId, Number(e.target.value))}
        sx={{
          fontSize: "0.75rem",
          height: "28px",
          color: "text.secondary",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.1)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1565C060" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1565C0" },
        }}
      >
        {SEASONS.map((year) => (
          <MenuItem key={year} value={year} sx={{ fontSize: "0.75rem" }}>
            {year} Season
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
```

- [ ] **Step 2: Write CitationBadge**

Create `components/ui/CitationBadge.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

interface Props {
  citation: string;
}

export function CitationBadge({ citation }: Props) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono
        bg-frc-blue/10 border border-frc-blue/20 text-frc-blue/90
        hover:bg-frc-blue/20 transition-colors cursor-default"
    >
      <BookOpen size={10} />
      {citation}
    </motion.span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/SeasonSelector.tsx components/ui/CitationBadge.tsx
git commit -m "feat: add SeasonSelector (MUI) and CitationBadge components"
```

---

## Task 9: StreamingIndicator

**Files:**
- Create: `components/chat/StreamingIndicator.tsx`

- [ ] **Step 1: Write animated FIRST-style streaming indicator**

Create `components/chat/StreamingIndicator.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";

export function StreamingIndicator() {
  const dotVariants = {
    initial: { scale: 0.6, opacity: 0.4 },
    animate: { scale: 1, opacity: 1 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-frc-blue/20 border border-frc-blue/30">
        <Bot size={14} className="text-frc-blue" />
      </div>
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-elevated border border-surface-border">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", delay: i * 0.2 }}
            className="block w-1.5 h-1.5 rounded-full bg-frc-blue"
          />
        ))}
        {/* FIRST-style animated chevron */}
        <motion.svg
          width="12" height="10" viewBox="0 0 12 10"
          className="ml-1 text-frc-blue/40"
          animate={{ x: [0, 3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            d="M1 1L6 5L1 9M6 1L11 5L6 9"
            stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none"
          />
        </motion.svg>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/StreamingIndicator.tsx
git commit -m "feat: add animated FIRST-style streaming indicator with chevron"
```

---

## Task 10: MessageBubble

**Files:**
- Create: `components/chat/MessageBubble.tsx`

- [ ] **Step 1: Write MessageBubble with markdown + syntax highlight + citations**

Create `components/chat/MessageBubble.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";
import { CitationBadge } from "@/components/ui/CitationBadge";
import { parseCitations } from "@/lib/utils";
import { Message } from "@/lib/store";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-border/60 hover:bg-surface-border
        text-text-muted hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
      aria-label="Copy code"
    >
      {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
    </button>
  );
}

interface Props {
  message: Message;
  isStreaming?: boolean;
  streamContent?: string;
}

export function MessageBubble({ message, isStreaming, streamContent }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isUser = message.role === "user";
  const content = isStreaming ? (streamContent ?? "") : message.content;
  const citations = !isStreaming ? parseCitations(content) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full border ${
        isUser
          ? "bg-frc-blue/20 border-frc-blue/40"
          : "bg-surface-elevated border-surface-border"
      }`}>
        {isUser
          ? <User size={14} className="text-frc-blue" />
          : <Bot size={14} className="text-frc-blue" />
        }
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-2 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "rounded-tr-sm bg-gradient-to-br from-frc-blue to-[#0D47A1] text-white"
            : "rounded-tl-sm bg-surface-elevated border border-surface-border text-text-primary"
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeText = String(children).replace(/\n$/, "");
                  if (!inline && match) {
                    return (
                      <div className="relative group my-2 rounded-lg overflow-hidden border border-surface-border">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-surface-border/60 border-b border-surface-border">
                          <span className="text-xs font-mono text-text-muted">{match[1]}</span>
                          <CopyButton text={codeText} />
                        </div>
                        <SyntaxHighlighter
                          style={isDark ? vscDarkPlus : vs}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: 0, background: "transparent",
                            fontSize: "0.8rem", fontFamily: "JetBrains Mono, monospace",
                          }}
                          {...props}
                        >
                          {codeText}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-surface-border font-mono text-xs text-frc-yellow" {...props}>
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-x-auto my-2">
                      <table className="w-full text-xs border-collapse border border-surface-border rounded-lg overflow-hidden">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return <th className="px-3 py-2 bg-surface-border/60 text-left font-semibold text-text-muted border-b border-surface-border">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-3 py-2 border-b border-surface-border/40">{children}</td>;
                },
                a({ href, children }) {
                  return <a href={href} target="_blank" rel="noopener noreferrer" className="text-frc-blue hover:underline">{children}</a>;
                },
              }}
            >
              {content}
            </ReactMarkdown>
          )}

          {/* Streaming cursor */}
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="inline-block w-0.5 h-4 bg-frc-blue ml-0.5 align-middle"
            />
          )}
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {citations.map((c, i) => <CitationBadge key={i} citation={c} />)}
          </div>
        )}

        <span className="text-xs text-text-muted opacity-50 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/MessageBubble.tsx
git commit -m "feat: add MessageBubble with markdown, syntax highlighting, citations"
```

---

## Task 11: EmptyState

**Files:**
- Create: `components/chat/EmptyState.tsx`

- [ ] **Step 1: Write EmptyState with staggered animation**

Create `components/chat/EmptyState.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { Bot, Zap } from "lucide-react";

const STARTER_PROMPTS = [
  "Explain the 2025 game objectives",
  "What are the robot weight limits?",
  "How do I program a PID controller in WPILib?",
  "What's the difference between auto and teleop periods?",
  "Help me plan a scouting spreadsheet",
  "Explain the alliance selection process",
];

interface Props {
  onPromptSelect: (prompt: string) => void;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export function EmptyState({ onPromptSelect }: Props) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full px-8 py-16 text-center"
    >
      <motion.div variants={itemVariants} className="relative mb-6">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-frc-blue/10 border border-frc-blue/20">
          <Bot size={36} className="text-frc-blue" />
          <motion.div
            className="absolute inset-0 rounded-2xl border border-frc-blue/30"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <Zap size={14} className="absolute -top-1 -right-1 text-frc-yellow" />
      </motion.div>

      <motion.h2 variants={itemVariants} className="text-2xl font-bold text-text-primary mb-2 tracking-tight">
        Welcome to Curator
      </motion.h2>
      <motion.p variants={itemVariants} className="text-sm text-text-muted mb-8 max-w-sm">
        Your AI-powered FIRST Robotics Competition assistant. Ask anything about FRC rules, programming, strategy, and more.
      </motion.p>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {STARTER_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.07, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onPromptSelect(prompt)}
            className="text-left px-3.5 py-3 rounded-xl border border-surface-border bg-surface-elevated
              hover:border-frc-blue/40 hover:bg-frc-blue/5 transition-all duration-200
              text-sm text-text-muted hover:text-text-primary group"
          >
            <span className="text-frc-blue/60 mr-2 group-hover:text-frc-blue transition-colors">›</span>
            {prompt}
          </motion.button>
        ))}
      </motion.div>

      <motion.p variants={itemVariants} className="mt-8 text-xs text-text-muted/60">
        Powered by Gemma 3 27B via OpenRouter
      </motion.p>
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/EmptyState.tsx
git commit -m "feat: add EmptyState with staggered animation and starter prompts"
```

---

## Task 12: Auto-Scroll + LocalStorage Hooks

**Files:**
- Create: `hooks/useAutoScroll.ts`
- Create: `hooks/useLocalStorage.ts`

- [ ] **Step 1: Write hooks/useAutoScroll.ts**

```typescript
import { useRef, useEffect, useCallback } from "react";

export function useAutoScroll(dependencies: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      isUserScrolledRef.current = scrollHeight - scrollTop - clientHeight > 80;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isUserScrolledRef.current) {
      scrollToBottom("smooth");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { containerRef, scrollToBottom };
}
```

- [ ] **Step 2: Write hooks/useLocalStorage.ts**

```typescript
import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);

  return [value, setValue] as const;
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/
git commit -m "feat: add useAutoScroll (with scroll-up pause) and useLocalStorage hooks"
```

---

## Task 13: InputBar

**Files:**
- Create: `components/chat/InputBar.tsx`

- [ ] **Step 1: Write InputBar with auto-expand + streaming state**

Create `components/chat/InputBar.tsx`:

```typescript
"use client";

import { useRef, useState, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, AlertTriangle } from "lucide-react";
import { estimateTokens } from "@/lib/utils";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
}

export function InputBar({ onSend, disabled, isStreaming }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 144)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || isStreaming) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const tokens = estimateTokens(value);
  const canSend = value.trim().length > 0 && !disabled && !isStreaming;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="input-glow rounded-2xl border border-surface-border bg-surface-elevated transition-all duration-200">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about FRC rules, programming, strategy..."
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-sm text-text-primary placeholder:text-text-muted resize-none outline-none leading-6 font-sans"
          style={{ maxHeight: "144px" }}
        />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-text-muted/60 font-mono">~{tokens} tokens · ⏎ send · ⇧⏎ newline</span>
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { scale: 1.05 } : {}}
            whileTap={canSend ? { scale: 0.95 } : {}}
            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${
              canSend
                ? "bg-frc-blue text-white hover:bg-frc-blue/90 shadow-[0_0_12px_rgba(21,101,192,0.4)]"
                : "bg-surface-border text-text-muted cursor-not-allowed"
            }`}
            aria-label="Send message"
          >
            <AnimatePresence mode="wait">
              {isStreaming
                ? <motion.span key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="w-3 h-3 rounded-sm bg-current" />
                : <motion.div key="send" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Send size={14} /></motion.div>
              }
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 justify-center mt-2">
        <AlertTriangle size={10} className="text-warning/60" />
        <p className="text-xs text-text-muted/50">
          Curator may make mistakes. Always verify with official FIRST materials.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/InputBar.tsx
git commit -m "feat: add auto-expanding InputBar with streaming state toggle"
```

---

## Task 14: SettingsModal

**Files:**
- Create: `components/ui/SettingsModal.tsx`

- [ ] **Step 1: Write SettingsModal with Chakra UI**

Create `components/ui/SettingsModal.tsx`:

```typescript
"use client";

import {
  Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalCloseButton, Input, FormLabel,
  FormControl, Slider, SliderTrack, SliderFilledTrack,
  SliderThumb, Text, VStack, HStack, Badge,
} from "@chakra-ui/react";
import { useChatStore } from "@/lib/store";
import { Settings } from "lucide-react";

export function SettingsModal() {
  const { settingsOpen, setSettingsOpen, temperature, setTemperature, apiKeyOverride, setApiKeyOverride } =
    useChatStore();

  return (
    <Modal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} size="md">
      <ModalOverlay backdropFilter="blur(8px)" bg="blackAlpha.700" />
      <ModalContent
        bg="var(--card, #12121A)"
        borderColor="rgba(255,255,255,0.08)"
        borderWidth={1}
        borderRadius="xl"
      >
        <ModalHeader display="flex" alignItems="center" gap={2} fontSize="sm" fontWeight={600}>
          <Settings size={16} />
          Curator Settings
        </ModalHeader>
        <ModalCloseButton size="sm" />
        <ModalBody pb={6}>
          <VStack spacing={5} align="stretch">
            <FormControl>
              <FormLabel fontSize="xs" color="gray.500" mb={1.5}>
                OpenRouter API Key Override
              </FormLabel>
              <Input
                type="password"
                placeholder="sk-or-v1-... (uses server key if empty)"
                value={apiKeyOverride}
                onChange={(e) => setApiKeyOverride(e.target.value)}
                size="sm"
                borderRadius="lg"
                fontSize="xs"
                fontFamily="mono"
                _focus={{ borderColor: "#1565C0", boxShadow: "0 0 0 1px #1565C040" }}
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                Stored locally in your browser only.
              </Text>
            </FormControl>

            <FormControl>
              <HStack justify="space-between" mb={2}>
                <FormLabel fontSize="xs" color="gray.500" m={0}>Temperature</FormLabel>
                <Badge fontFamily="mono" fontSize="xs" colorScheme="blue" variant="subtle" borderRadius="md">
                  {temperature.toFixed(2)}
                </Badge>
              </HStack>
              <Slider value={temperature} onChange={setTemperature} min={0} max={1} step={0.05}>
                <SliderTrack borderRadius="full">
                  <SliderFilledTrack bg="#1565C0" />
                </SliderTrack>
                <SliderThumb boxSize={4} bg="white" border="2px solid" borderColor="#1565C0" />
              </Slider>
              <HStack justify="space-between" mt={1}>
                <Text fontSize="xs" color="gray.600">Precise</Text>
                <Text fontSize="xs" color="gray.600">Creative</Text>
              </HStack>
            </FormControl>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/8 bg-black/20">
              <span className="w-2 h-2 rounded-full bg-success" />
              <div>
                <p className="text-xs font-medium">Gemma 3 27B Instruct</p>
                <p className="text-xs text-text-muted opacity-60">via OpenRouter · Free tier</p>
              </div>
            </div>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/SettingsModal.tsx
git commit -m "feat: add SettingsModal with API key override + temperature slider"
```

---

## Task 15: Sidebar Components

**Files:**
- Create: `components/sidebar/ConversationItem.tsx`
- Create: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Write ConversationItem**

Create `components/sidebar/ConversationItem.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import { Conversation } from "@/lib/store";

interface Props {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function ConversationItem({ conversation, isActive, onClick, onDelete }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 ${
        isActive
          ? "bg-frc-blue/20 border border-frc-blue/30 text-text-primary"
          : "hover:bg-surface-border/60 text-text-muted hover:text-text-primary"
      }`}
      onClick={onClick}
    >
      <MessageSquare size={14} className="shrink-0 opacity-60" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{conversation.title}</p>
        <p className="text-xs opacity-50 mt-0.5">
          {formatTimestamp(new Date(conversation.updatedAt))}
        </p>
      </div>
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-frc-red"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete conversation"
      >
        <Trash2 size={12} />
      </button>
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-frc-blue rounded-full"
        />
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Write Sidebar**

Create `components/sidebar/Sidebar.tsx`:

```typescript
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationItem } from "./ConversationItem";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useChatStore } from "@/lib/store";

export function Sidebar() {
  const {
    conversations, activeConversationId, sidebarOpen,
    newConversation, setActiveConversation, deleteConversation,
    setSidebarOpen, setSettingsOpen,
  } = useChatStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex-shrink-0 overflow-hidden"
    >
      <div className="circuit-bg h-full w-[260px] flex flex-col bg-surface-elevated border-r border-surface-border">
        {/* Branding */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-surface-border">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-frc-blue/20 border border-frc-blue/30">
            <Bot size={16} className="text-frc-blue" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary tracking-wide">CURATOR</h1>
            <p className="text-xs text-text-muted">FRC Intelligence</p>
          </div>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <Button
            onClick={newConversation}
            className="w-full gap-2 bg-frc-blue hover:bg-frc-blue/90 text-white font-medium text-sm h-9 transition-all duration-200 hover:shadow-[0_0_15px_rgba(21,101,192,0.4)]"
          >
            <Plus size={15} />
            New Chat
          </Button>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {conversations.length === 0 ? (
            <p className="text-center text-xs text-text-muted py-8 px-4">
              Start a new chat to begin exploring FRC knowledge.
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5 rounded-md hover:bg-surface-border/60"
            >
              <Settings size={13} />
              Settings
            </button>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-surface-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-xs text-text-muted font-mono">Gemma 3 27B · OpenRouter</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

export function SidebarToggle() {
  const { sidebarOpen, setSidebarOpen } = useChatStore();
  return (
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-surface-border transition-colors text-text-muted hover:text-text-primary"
      aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
    >
      {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/sidebar/
git commit -m "feat: add Sidebar with circuit texture, branding, and animated history"
```

---

## Task 16: ChatWindow

**Files:**
- Create: `components/chat/ChatWindow.tsx`

- [ ] **Step 1: Write ChatWindow orchestrating all chat components**

Create `components/chat/ChatWindow.tsx`:

```typescript
"use client";

import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";
import { EmptyState } from "./EmptyState";
import { InputBar } from "./InputBar";
import { SeasonSelector } from "@/components/ui/SeasonSelector";
import { SidebarToggle } from "@/components/sidebar/Sidebar";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { useChatStore } from "@/lib/store";
import { streamOpenRouterChat } from "@/lib/openrouter";
import { buildSystemPrompt } from "@/lib/frc-system-prompt";

export function ChatWindow() {
  const {
    activeConversation, activeConversationId,
    streamingContent, isStreaming, temperature, apiKeyOverride,
    newConversation, addMessage, updateStreamingContent,
    finalizeStreamingMessage, clearConversation,
  } = useChatStore();

  const conversation = activeConversation();
  const { containerRef, scrollToBottom } = useAutoScroll([
    conversation?.messages.length, streamingContent,
  ]);

  useEffect(() => {
    if (!activeConversationId) newConversation();
  }, [activeConversationId, newConversation]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeConversationId || isStreaming) return;
      const convId = activeConversationId;

      addMessage(convId, { role: "user", content: text });

      const currentConv = useChatStore.getState().activeConversation();
      const seasonYear = currentConv?.seasonYear ?? 2025;
      const history = (currentConv?.messages ?? [])
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      history.push({ role: "user", content: text });

      let accumulated = "";
      await streamOpenRouterChat({
        messages: [{ role: "system", content: buildSystemPrompt(seasonYear) }, ...history],
        temperature,
        apiKey: apiKeyOverride || undefined,
        onToken: (token) => {
          accumulated += token;
          updateStreamingContent(accumulated);
        },
        onDone: () => {
          finalizeStreamingMessage(convId);
          scrollToBottom();
        },
        onError: (err) => {
          finalizeStreamingMessage(convId);
          window.dispatchEvent(
            new CustomEvent("curator:error", {
              detail: { message: err.message || "Failed to reach OpenRouter. Check your API key." },
            })
          );
        },
      });
    },
    [activeConversationId, isStreaming, temperature, apiKeyOverride,
     addMessage, updateStreamingContent, finalizeStreamingMessage, scrollToBottom]
  );

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {/* Header */}
      <div className="scanline flex items-center gap-3 px-4 h-14 border-b border-surface-border bg-surface-elevated/50 backdrop-blur-sm flex-shrink-0">
        <SidebarToggle />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-text-primary truncate">
            {conversation?.title ?? "Curator"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {conversation && (
            <SeasonSelector conversationId={conversation.id} value={conversation.seasonYear} />
          )}
          {conversation && messages.length > 0 && (
            <button
              onClick={() => clearConversation(conversation.id)}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-surface-border text-text-muted hover:text-frc-red transition-all"
              title="Clear chat"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" onPromptSelect={handleSend} />
          ) : (
            <motion.div key="messages" className="py-4">
              {messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
              {isStreaming && streamingContent && (
                <MessageBubble
                  key="streaming"
                  message={{ id: "streaming", role: "assistant", content: streamingContent, timestamp: new Date() }}
                  isStreaming
                  streamContent={streamingContent}
                />
              )}
              {isStreaming && !streamingContent && <StreamingIndicator key="indicator" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InputBar onSend={handleSend} disabled={!activeConversationId} isStreaming={isStreaming} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/chat/ChatWindow.tsx
git commit -m "feat: add ChatWindow orchestrating streaming, auto-scroll, and empty state"
```

---

## Task 17: PageTransition + Main Page Assembly

**Files:**
- Create: `components/PageTransition.tsx`
- Create: `components/ui/ErrorToast.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write PageTransition**

Create `components/PageTransition.tsx`:

```typescript
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ height: "100vh", display: "flex", flexDirection: "column" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Write ErrorToast listener**

Create `components/ui/ErrorToast.tsx`:

```typescript
"use client";

import { useToast } from "@chakra-ui/react";
import { useEffect } from "react";

export function ErrorToastListener() {
  const toast = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      const { message } = (e as CustomEvent).detail;
      toast({
        title: "Connection Error",
        description: message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    };
    window.addEventListener("curator:error", handler);
    return () => window.removeEventListener("curator:error", handler);
  }, [toast]);

  return null;
}
```

- [ ] **Step 3: Write main app/page.tsx (desktop + mobile)**

```typescript
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { SettingsModal } from "@/components/ui/SettingsModal";
import { ErrorToastListener } from "@/components/ui/ErrorToast";
import { useChatStore } from "@/lib/store";

export default function Home() {
  const { sidebarOpen, setSidebarOpen } = useChatStore();

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      <ErrorToastListener />

      {/* Desktop sidebar (in document flow) */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar (overlay) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ChatWindow />
      <SettingsModal />
    </main>
  );
}
```

- [ ] **Step 4: Update layout.tsx to use PageTransition**

In `app/layout.tsx`, wrap children:
```typescript
<Providers>
  <PageTransition>{children}</PageTransition>
</Providers>
```

- [ ] **Step 5: Full build check**

```bash
npm run build 2>&1 | tail -30
```

Expected: Build succeeds. Fix any TypeScript errors shown before proceeding.

- [ ] **Step 6: Dev server smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- [ ] "CURATOR" branding in sidebar
- [ ] Dark mode is default; theme toggle switches to light with spring animation
- [ ] Empty state shows with 6 prompt chips
- [ ] Clicking a chip sends the message and AI responds (needs valid API key)
- [ ] Tokens stream in with blinking cursor
- [ ] Conversation appears in sidebar history with auto-generated title
- [ ] Season selector changes year
- [ ] Settings modal opens with API key + temperature slider
- [ ] Clear chat button removes messages
- [ ] On mobile viewport (<768px): sidebar shows as overlay

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/layout.tsx components/PageTransition.tsx components/ui/ErrorToast.tsx
git commit -m "feat: assemble main page with mobile overlay sidebar and page transition"
```

---

## Spec Coverage

| Requirement | Task |
|---|---|
| Next.js 14 App Router | 1 |
| OpenRouter gemma-3-27b-it:free | 5, 6 |
| shadcn/ui + MUI + Chakra | 1, 3, 8, 14 |
| Tailwind CSS + TypeScript | 1, 2 |
| FRC anti-hallucination system prompt | 5 |
| FIRST color palette | 2 |
| Inter + JetBrains Mono fonts | 2, 3 |
| Collapsible sidebar + history | 15, 17 |
| New Chat button | 15 |
| Settings gear + model badge | 15 |
| Mobile sidebar as overlay | 17 |
| Header with title + season + clear | 16 |
| User/AI message bubbles (right/left aligned) | 10 |
| Markdown rendering + GFM tables | 10 |
| Syntax highlighting (JetBrains Mono) | 10 |
| Copy button on code blocks | 10 |
| Citation badges | 8, 10 |
| Streaming indicator (chevron dots) | 9 |
| Blinking cursor during streaming | 10 |
| Empty state + 6 starter prompts | 11 |
| Auto-expanding textarea | 13 |
| Enter to send / Shift+Enter newline | 13 |
| Token counter | 13 |
| Disclaimer badge | 13 |
| SSE streaming via ReadableStream | 5, 6 |
| Auto-scroll with pause on scroll-up | 12, 16 |
| Chakra toast on API errors | 14, 17 |
| Dark/light mode toggle with spring | 7 |
| Dark mode default | 2, 3 |
| Circuit board sidebar texture (CSS) | 2 |
| Scanline futuristic header | 2 |
| App named "Curator" | 1, 5 |
| Semi-futuristic UI with Framer Motion | 7–17 |
| SettingsModal (API key + temperature) | 14 |
| Page fade-in transition | 17 |
| Mobile responsive | 17 |
| Zustand persistence (localStorage) | 4 |
