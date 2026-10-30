export const SUPPORT_LIMITS = {
  name: 254,
  email: 254,
  subject: 120,
  message: 10_000,
  pagePath: 1_000,
} as const;

export const REPORT_REASON_MAX_LENGTH = 2_000;

// Raw (pre-sanitization) input may legitimately exceed the stored limit
// because markup is stripped before the limit is applied, but it must still
// be bounded before any regex work happens so an unauthenticated caller can't
// hand the sanitizer megabytes of nested tags.
const RAW_INPUT_MULTIPLIER = 4;

// Upper bound on sanitizer passes. Realistic nested/split constructs
// ("<scr<script>ipt>") stabilise in two or three passes; anything that is
// still changing after this many is adversarial, and the remaining angle
// brackets are stripped outright instead of looping further.
const MAX_SANITIZE_PASSES = 8;

type SupportInput = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  pagePath?: unknown;
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
  let sanitized = value.replace(CONTROL_CHARS, "");

  // Repeat until stable so nested or split constructs ("<scr<script>ipt>")
  // cannot reassemble into a tag once the inner match is removed. The pass
  // count is bounded: each pass is linear, so total work stays linear in the
  // input size instead of quadratic.
  let stable = false;
  for (let pass = 0; pass < MAX_SANITIZE_PASSES; pass += 1) {
    const next = sanitized.replace(HTML_COMMENT, "").replace(HTML_TAG, "");
    if (next === sanitized) {
      stable = true;
      break;
    }
    sanitized = next;
  }

  if (!stable) {
    sanitized = sanitized.replace(/[<>]/g, "");
  }

  return sanitized.trim();
}

type FieldCheck = { ok: true; value: string } | { ok: false; error: string };

function readField(value: unknown, max: number, label: string): FieldCheck {
  if (value === undefined || value === null) return { ok: true, value: "" };
  if (typeof value !== "string") {
    return { ok: false, error: `${label} must be text.` };
  }

  // Bound the raw string before any sanitization runs.
  if (value.length > max * RAW_INPUT_MULTIPLIER) {
    return { ok: false, error: `${label} must be ${max} characters or fewer.` };
  }

  return { ok: true, value: sanitizePlainTextInput(value) };
}

function maxLength(value: string, max: number, label: string): { ok: true } | { ok: false; error: string } {
  if (value.length <= max) return { ok: true };
  return { ok: false, error: `${label} must be ${max} characters or fewer.` };
}

export function validateSupportRequestInput(input: SupportInput): SupportResult {
  const fields = {
    name: readField(input.name, SUPPORT_LIMITS.name, "Name"),
    email: readField(input.email, SUPPORT_LIMITS.email, "Email"),
    subject: readField(input.subject, SUPPORT_LIMITS.subject, "Subject"),
    message: readField(input.message, SUPPORT_LIMITS.message, "Message"),
    pagePath: readField(input.pagePath, SUPPORT_LIMITS.pagePath, "Page path"),
  };

  for (const field of Object.values(fields)) {
    if (!field.ok) return field;
  }

  const value = {
    name: fields.name.ok ? fields.name.value : "",
    email: fields.email.ok ? fields.email.value : "",
    subject: fields.subject.ok ? fields.subject.value : "",
    message: fields.message.ok ? fields.message.value : "",
    pagePath: fields.pagePath.ok ? fields.pagePath.value : "",
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
