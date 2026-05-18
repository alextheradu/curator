import * as Sentry from "@sentry/nextjs";
import {
  getSentryClientDsn,
  getSentryClientTracesSampleRate,
  getSentryReplayConfig,
  scrubSentryEvent,
} from "@/lib/sentry";

const dsn = getSentryClientDsn();
const replay = getSentryReplayConfig();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  sendDefaultPii: false,
  tracesSampleRate: getSentryClientTracesSampleRate(),
  enableLogs: false,
  beforeSend: scrubSentryEvent,
  ...(replay.enabled
    ? {
        integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
        replaysSessionSampleRate: replay.replaysSessionSampleRate,
        replaysOnErrorSampleRate: replay.replaysOnErrorSampleRate,
      }
    : {}),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
