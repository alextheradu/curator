import * as Sentry from "@sentry/nextjs";
import {
  getSentryClientDsn,
  getSentryClientTracesSampleRate,
  getSentryReplayConfig,
  getSentryTunnelPath,
} from "@/lib/sentry";

const dsn = getSentryClientDsn();
const replay = getSentryReplayConfig();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tunnel: dsn ? getSentryTunnelPath() : undefined,
  sendDefaultPii: true,
  tracesSampleRate: getSentryClientTracesSampleRate(),
  enableLogs: true,
  ...(replay.enabled
    ? {
        integrations: [Sentry.replayIntegration()],
        replaysSessionSampleRate: replay.replaysSessionSampleRate,
        replaysOnErrorSampleRate: replay.replaysOnErrorSampleRate,
      }
    : {}),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
