// Some open-weight models (routed through OpenRouter without native
// function-calling support) fall back to emitting their tool-call protocol
// as literal text inside the completion, e.g.:
//
//   <tool_call>
//   web_search
//   <arg_key>query</arg_key>
//   <arg_value>FIRST Robotics Competition 2026 rules game manual</arg_value>
//   </tool_call>
//
// This must never reach the user. The final answer-generation call in
// app/api/chat/route.ts intentionally omits `tools`, so a leaked block here
// is always a hallucinated/erroneous artifact, not a real invocation - safe
// to drop entirely rather than try to execute it.

const OPEN_TAG = "<tool_call>";
const CLOSE_TAG = "</tool_call>";

function longestSuffixOverlap(text: string, tag: string): number {
  const max = Math.min(text.length, tag.length - 1);
  for (let len = max; len > 0; len--) {
    if (text.toLowerCase().endsWith(tag.slice(0, len).toLowerCase())) {
      return len;
    }
  }
  return 0;
}

/**
 * Stream-safe filter: call `push()` with each raw token as it arrives and
 * forward only its return value to the client. Tags may be split across
 * chunk boundaries, so a small tail is held back between calls rather than
 * emitted immediately - this is what keeps partial `<tool_c` fragments from
 * flashing on screen before being recognized as the start of a real tag.
 * Call `flush()` once when the stream ends to release any trailing text
 * that was held back but never turned out to be a tag.
 */
export function createToolCallStreamFilter() {
  let mode: "normal" | "inside" = "normal";
  let pending = "";
  let strippedBlocks = 0;

  function push(chunk: string): string {
    let buffer = pending + chunk;
    pending = "";
    let output = "";

    for (;;) {
      if (mode === "normal") {
        const idx = buffer.toLowerCase().indexOf(OPEN_TAG);
        if (idx === -1) {
          const overlap = longestSuffixOverlap(buffer, OPEN_TAG);
          output += buffer.slice(0, buffer.length - overlap);
          pending = buffer.slice(buffer.length - overlap);
          return output;
        }
        output += buffer.slice(0, idx);
        buffer = buffer.slice(idx + OPEN_TAG.length);
        mode = "inside";
        strippedBlocks++;
      } else {
        const idx = buffer.toLowerCase().indexOf(CLOSE_TAG);
        if (idx === -1) {
          // Still inside the block - none of this is shown. Keep only a
          // short tail in case it's the start of the closing tag.
          pending = buffer.slice(buffer.length - longestSuffixOverlap(buffer, CLOSE_TAG));
          return output;
        }
        buffer = buffer.slice(idx + CLOSE_TAG.length);
        mode = "normal";
      }
    }
  }

  function flush(): string {
    // A held-back "normal" tail was just innocuous text that happened to
    // start like `<tool_call>` - release it. A block that opened but never
    // closed (truncated stream) is dropped rather than shown half-formed.
    const leftover = mode === "normal" ? pending : "";
    pending = "";
    return leftover;
  }

  return { push, flush, get strippedBlocks() { return strippedBlocks; } };
}

/**
 * Non-streaming cleanup for already-complete text: strips any tool-call
 * blocks (closed or dangling) and stray arg tags. Used to render already
 * persisted assistant messages that leaked this markup before the
 * server-side stream filter above existed.
 */
export function stripToolCallMarkup(text: string): string {
  if (!text.includes("<tool_call") && !text.includes("<arg_key") && !text.includes("<arg_value")) {
    return text;
  }

  return text
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    // Dangling/truncated block with no closing tag - drop to end of text.
    .replace(/<tool_call>[\s\S]*$/gi, "")
    // Orphaned arg tags without a wrapping tool_call (partial persisted rows).
    .replace(/<arg_key>[\s\S]*?<\/arg_key>/gi, "")
    .replace(/<arg_value>[\s\S]*?<\/arg_value>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
