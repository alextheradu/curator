// Only the first ~120 characters of a message survive as a search description,
// so there is no reason to run any regex over the full (up to 30k char)
// content. Slicing first also caps the work the bounded patterns below do.
const DESCRIPTION_SOURCE_CHARS = 1_000;
export const DESCRIPTION_MAX_CHARS = 120;

// Bounded character classes instead of lazy `.*?` groups: the old
// `/\[(.*?)\]\((.*?)\)/g` backtracked polynomially on input like "[](" repeated
// thousands of times, which let a signed-in user stall the event loop from the
// conversation list endpoint. These patterns cannot backtrack across a `]`,
// `(`, `)` or newline, so their cost is linear in the input.
const CODE_FENCE = /```[^`]{0,2000}```/g;
const INLINE_CODE = /`([^`\n]{1,500})`/g;
const MARKDOWN_LINK = /\[([^[\]\n]{0,200})\]\(([^()\n]{0,500})\)/g;

export function buildConversationDescription(content: string) {
  return content
    .slice(0, DESCRIPTION_SOURCE_CHARS)
    .replace(CODE_FENCE, " ")
    .replace(INLINE_CODE, "$1")
    .replace(MARKDOWN_LINK, "$1")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DESCRIPTION_MAX_CHARS);
}
