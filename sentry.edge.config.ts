import * as Sentry from "@sentry/nextjs";
import {
  getSentryServerDsn,
  getSentryServerEnvironment,
  getSentryServerTracesSampleRate,
} from "@/lib/sentry";

const dsn = getSentryServerDsn();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: getSentryServerEnvironment(),
  sendDefaultPii: true,
  tracesSampleRate: getSentryServerTracesSampleRate(),
  enableLogs: true,
});
