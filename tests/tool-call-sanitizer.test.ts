import { describe, expect, it } from "vitest";

import { createToolCallStreamFilter, stripToolCallMarkup } from "@/lib/tool-call-sanitizer";

const LEAKED_BLOCK = [
  "<tool_call>",
  "web_search",
  "<arg_key>query</arg_key>",
  "<arg_value>FIRST Robotics Competition 2026 rules game manual</arg_value>",
  "</tool_call>",
].join("\n");

describe("createToolCallStreamFilter", () => {
  it("passes through normal text untouched", () => {
    const filter = createToolCallStreamFilter();
    const out = filter.push("Bumpers must be full perimeter and rigidly attached.");
    expect(out).toBe("Bumpers must be full perimeter and rigidly attached.");
    expect(filter.strippedBlocks).toBe(0);
  });

  it("strips a tool_call block delivered in a single chunk", () => {
    const filter = createToolCallStreamFilter();
    const before = filter.push(`Let me check. ${LEAKED_BLOCK} Rebuilt has a height limit of...`);
    const after = filter.flush();

    expect(before + after).toBe("Let me check.  Rebuilt has a height limit of...");
    expect(filter.strippedBlocks).toBe(1);
  });

  it("strips a tool_call block split across many small streamed chunks", () => {
    const filter = createToolCallStreamFilter();
    const full = `Checking sources first. ${LEAKED_BLOCK} Here's the answer.`;
    let output = "";
    // Push one character at a time - the worst case for a chunk boundary
    // landing mid-tag.
    for (const char of full) {
      output += filter.push(char);
    }
    output += filter.flush();

    expect(output).toBe("Checking sources first.  Here's the answer.");
    expect(output).not.toContain("<tool_call>");
    expect(output).not.toContain("<arg_key>");
    expect(filter.strippedBlocks).toBe(1);
  });

  it("never flashes a partial opening tag while more chunks are still arriving", () => {
    const filter = createToolCallStreamFilter();
    // "<tool_c" is an unresolved prefix - must be held back, not emitted.
    expect(filter.push("some text <tool_c")).toBe("some text ");
    // Completing the tag must not have leaked the held-back prefix either.
    expect(filter.push("all>hidden</tool_call> visible")).toBe(" visible");
  });

  it("releases held-back text that turned out not to be a tag", () => {
    const filter = createToolCallStreamFilter();
    const out = filter.push("price is < tool_calibration cost");
    expect(out).toBe("price is < tool_calibration cost");
    expect(filter.strippedBlocks).toBe(0);
  });

  it("handles multiple sequential tool_call blocks in one response", () => {
    const filter = createToolCallStreamFilter();
    const out = filter.push(`${LEAKED_BLOCK} some text between ${LEAKED_BLOCK} end`);
    expect(out + filter.flush()).toBe(" some text between  end");
    expect(filter.strippedBlocks).toBe(2);
  });

  it("drops a block that opens but never closes (truncated/cancelled stream)", () => {
    const filter = createToolCallStreamFilter();
    const out = filter.push(`Answer so far. <tool_call>\nweb_search\n<arg_key>query`);
    expect(out).toBe("Answer so far. ");
    // Stream ends mid-block (e.g. cancellation) - nothing further is ever shown.
    expect(filter.flush()).toBe("");
  });

  it("preserves legitimate angle brackets in normal user-visible text", () => {
    const filter = createToolCallStreamFilter();
    const out = filter.push("If x < 5 and y > 3, the <intake> mechanism engages.");
    expect(out + filter.flush()).toBe("If x < 5 and y > 3, the <intake> mechanism engages.");
    expect(filter.strippedBlocks).toBe(0);
  });
});

describe("stripToolCallMarkup", () => {
  it("returns plain text unchanged", () => {
    expect(stripToolCallMarkup("Rebuilt's height limit is defined in the manual.")).toBe(
      "Rebuilt's height limit is defined in the manual.",
    );
  });

  it("removes a leaked block from an already-persisted message", () => {
    const persisted = `Let me check that.\n\n${LEAKED_BLOCK}\n\nThe height limit is described in Section 8.`;
    const cleaned = stripToolCallMarkup(persisted);
    expect(cleaned).not.toContain("<tool_call>");
    expect(cleaned).not.toContain("<arg_value>");
    expect(cleaned).toContain("Let me check that.");
    expect(cleaned).toContain("The height limit is described in Section 8.");
  });

  it("removes a dangling block with no closing tag", () => {
    const cleaned = stripToolCallMarkup("Here's what I found.\n<tool_call>\nweb_search\n<arg_key>query");
    expect(cleaned).toBe("Here's what I found.");
  });
});
