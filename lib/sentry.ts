const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 1;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 1;
const DEFAULT_SENTRY_TUNNEL_PATH = "/monitoring";

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

export function getSentryTunnelPath() {
  return DEFAULT_SENTRY_TUNNEL_PATH;
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
