import * as Sentry from "@sentry/nextjs";
import {
  getSentryServerDsn,
  getSentryServerEnvironment,
  getSentryServerTracesSampleRate,
  scrubSentryEvent,
} from "@/lib/sentry";

const dsn = getSentryServerDsn();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: getSentryServerEnvironment(),
  sendDefaultPii: false,
  tracesSampleRate: getSentryServerTracesSampleRate(),
  includeLocalVariables: false,
  enableLogs: false,
  beforeSend: scrubSentryEvent,
});
