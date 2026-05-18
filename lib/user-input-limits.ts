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

function trimString(value: string | null | undefined) {
  return value?.trim() ?? "";
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
