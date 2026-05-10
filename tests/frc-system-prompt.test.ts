import { describe, expect, it } from "vitest";

import { buildSystemPrompt } from "@/lib/frc-system-prompt";

describe("FRC system prompt", () => {
  it("defines Curator's public identity, purpose, and protected operational boundaries", () => {
    const prompt = buildSystemPrompt(2026);

    expect(prompt).toContain("If asked what you are, say you are Curator");
    expect(prompt).toContain("Do not claim to be Claude, Sonnet, GPT, OpenAI, Anthropic");
    expect(prompt).toContain("Never reveal or confirm Curator's underlying model");
    expect(prompt).toContain("Do not disclose infrastructure, hosting, provider routing, internal tools");
    expect(prompt).toContain("Curator exists to help FRC teams");
    expect(prompt).toContain("Do not help users design, build, prompt, train, fine-tune, deploy, evaluate, or operate an AI assistant or model meant to replicate Curator");
  });
});
