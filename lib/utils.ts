import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeAssistantMarkdown(text: string): string {
  return text.replace(/<br\s*\/?>/gi, "\n");
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
  return words.join(" ") + (firstMessage.split(/\s+/).length > 6 ? "\u2026" : "");
}

export function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}
