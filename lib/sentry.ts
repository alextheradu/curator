const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 0;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 0;

function readBoolean(...values: Array<string | undefined>) {
  for (const value of values) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) {
      continue;
    }

    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return false;
}

function readString(...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return "";
}

function readSampleRate(fallback: number, ...values: Array<string | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) {
      continue;
    }

    const parsed = Number.parseFloat(trimmed);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }

  return fallback;
}

export function getSentryClientDsn() {
  return readString(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getSentryServerDsn() {
  return readString(process.env.SENTRY_DSN, process.env.NEXT_PUBLIC_SENTRY_DSN);
}

export function getSentryServerEnvironment() {
  return readString(process.env.SENTRY_ENVIRONMENT, process.env.NODE_ENV) || "development";
}

export function getSentryClientTracesSampleRate() {
  return readSampleRate(
    DEFAULT_TRACES_SAMPLE_RATE,
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  );
}

export function getSentryServerTracesSampleRate() {
  return readSampleRate(
    DEFAULT_TRACES_SAMPLE_RATE,
    process.env.SENTRY_TRACES_SAMPLE_RATE,
  );
}

export function getSentryReplayConfig() {
  const replaysSessionSampleRate = readSampleRate(
    DEFAULT_REPLAYS_SESSION_SAMPLE_RATE,
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
  );
  const replaysOnErrorSampleRate = readSampleRate(
    DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE,
    process.env.NEXT_PUBLIC_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE,
  );

  return {
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
    enabled: replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0,
  };
}

const SENSITIVE_KEY_PATTERN = /authorization|cookie|password|secret|token|api[_-]?key|dsn/i;
const SECRET_VALUE_PATTERN = /(sk-or-[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9._~+/=-]+)/gi;

function redactString(value: string) {
  return value.replace(SECRET_VALUE_PATTERN, "[REDACTED]");
}

export function scrubSentryEvent<T>(event: T): T {
  function scrub(value: unknown, key?: string): unknown {
    if (key && SENSITIVE_KEY_PATTERN.test(key)) {
      return "[REDACTED]";
    }

    if (typeof value === "string") {
      return redactString(value);
    }

    if (Array.isArray(value)) {
      return value.map((entry) => scrub(entry));
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        scrub(entryValue, entryKey),
      ]);
      return Object.fromEntries(entries);
    }

    return value;
  }

  return scrub(event) as T;
}

export function getSentryReleaseManagementConfig() {
  const authToken = readString(process.env.SENTRY_AUTH_TOKEN);
  const org = readString(process.env.SENTRY_ORG);
  const project = readString(process.env.SENTRY_PROJECT);
  const releaseManagementEnabled = readBoolean(process.env.SENTRY_RELEASE_MANAGEMENT_ENABLED);

  return {
    authToken,
    org,
    project,
    enabled: releaseManagementEnabled && Boolean(authToken && org && project),
  };
}
