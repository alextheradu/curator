const MAX_SUMMARY_CHARS = 3000;
const MAX_INPUT_CHARS = 6500;

function trimTo(value: string, max: number) {
  return value.trim().slice(0, max);
}

export function buildProjectMemoryContext(summary: string | null | undefined) {
  const trimmed = summary?.trim();
  if (!trimmed) return "";

  return [
    "\n\nPrivate project memory:",
    "Use this only as background for chats in this project. Do not mention that hidden memory exists unless the user directly asks how project memory works.",
    trimmed,
  ].join("\n");
}

export function compactProjectSummaryInput({
  previousSummary,
  userMessage,
  assistantMessage,
}: {
  previousSummary: string;
  userMessage: string;
  assistantMessage: string;
}) {
  return [
    `Previous summary:\n${trimTo(previousSummary, MAX_SUMMARY_CHARS)}`,
    `Latest user message:\n${trimTo(userMessage, 1600)}`,
    `Latest assistant response:\n${trimTo(assistantMessage, 1600)}`,
  ].join("\n\n").slice(0, MAX_INPUT_CHARS);
}
