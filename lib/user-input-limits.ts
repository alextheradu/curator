export const SUPPORT_LIMITS = {
  name: 254,
  email: 254,
  subject: 120,
  message: 10_000,
  pagePath: 1_000,
} as const;

export const REPORT_REASON_MAX_LENGTH = 2_000;

type SupportInput = {
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  pagePath?: string | null;
};

type SupportResult =
  | { ok: true; value: { name: string; email: string; subject: string; message: string; pagePath: string } }
  | { ok: false; error: string };

// Support ticket fields are plain text and are rendered as plain text in the
// admin panel. Sanitizing on the way in is defence in depth, so that a future
// change to that view (or an export, or an email digest) cannot turn stored
// user input into markup.
//
// This is a strict allowlist in the sense that nothing but plain text survives:
// no tags are kept, rather than a set of "safe" ones being permitted. A full
// HTML parser like DOMPurify is not pulled in because there is no HTML to
// preserve here - the only job is to make sure none can be stored.
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
const HTML_TAG = /<\/?[a-zA-Z][^<>]*>/g;
// Control characters other than tab and newline. Strips NUL (which Postgres
// rejects outright) and terminal escape sequences.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlainTextInput(value: string) {
  let previous = value;
  let sanitized = value.replace(CONTROL_CHARS, "");

  // Repeat until stable so nested or split constructs ("<scr<script>ipt>")
  // cannot reassemble into a tag once the inner match is removed.
  do {
    previous = sanitized;
    sanitized = sanitized.replace(HTML_COMMENT, "").replace(HTML_TAG, "");
  } while (sanitized !== previous);

  return sanitized.trim();
}

function trimString(value: string | null | undefined) {
  return sanitizePlainTextInput(value ?? "");
}

function maxLength(value: string, max: number, label: string): { ok: true } | { ok: false; error: string } {
  if (value.length <= max) return { ok: true };
  return { ok: false, error: `${label} must be ${max} characters or fewer.` };
}

export function validateSupportRequestInput(input: SupportInput): SupportResult {
  const value = {
    name: trimString(input.name),
    email: trimString(input.email),
    subject: trimString(input.subject),
    message: trimString(input.message),
    pagePath: trimString(input.pagePath),
  };

  if (!value.subject || !value.message) {
    return { ok: false, error: "Subject and message are required." };
  }

  if (value.message.length < 20) {
    return { ok: false, error: "Please provide at least 20 characters of detail." };
  }

  const checks = [
    maxLength(value.name, SUPPORT_LIMITS.name, "Name"),
    maxLength(value.email, SUPPORT_LIMITS.email, "Email"),
    maxLength(value.subject, SUPPORT_LIMITS.subject, "Subject"),
    maxLength(value.message, SUPPORT_LIMITS.message, "Message"),
    maxLength(value.pagePath, SUPPORT_LIMITS.pagePath, "Page path"),
  ];
  const failed = checks.find((check) => !check.ok);
  if (failed && !failed.ok) return failed;

  return { ok: true, value };
}

export function validateReportReason(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false as const, error: "messageId and reason are required" };
  }

  const reason = value.trim();
  if (reason.length > REPORT_REASON_MAX_LENGTH) {
    return { ok: false as const, error: `Reason must be ${REPORT_REASON_MAX_LENGTH} characters or fewer.` };
  }

  return { ok: true as const, value: reason };
}
