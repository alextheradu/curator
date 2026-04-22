import { withSystemDbAccess } from "@/lib/db/access";
import { appLogs } from "@/lib/db/schema";

type LogLevel = "info" | "warn" | "error";

type LogEvent = {
  level: LogLevel;
  source: string;
  message: string;
  path?: string | null;
  userId?: string | null;
  ip?: string | null;
  details?: Record<string, unknown> | null;
};

export async function logAppEvent(event: LogEvent) {
  if (event.level === "error") {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureMessage(event.message, "error");
    } catch {
      // Ignore Sentry transport/setup issues and keep local logging.
    }
  }

  try {
    await withSystemDbAccess((tx) => tx.insert(appLogs).values({
      level: event.level,
      source: event.source,
      message: event.message,
      path: event.path ?? null,
      userId: event.userId ?? null,
      ip: event.ip ?? null,
      details: event.details ?? null,
    }));
  } catch (error) {
    const fallback = {
      source: event.source,
      message: event.message,
      path: event.path ?? null,
      userId: event.userId ?? null,
      ip: event.ip ?? null,
      details: event.details ?? null,
      loggingError: error instanceof Error ? error.message : String(error),
    };

    if (event.level === "error") {
      console.error("[app-log]", fallback);
      return;
    }

    console.warn("[app-log]", fallback);
  }
}

export async function captureException(
  source: string,
  error: unknown,
  context?: Omit<LogEvent, "level" | "source" | "message">,
) {
  const message = error instanceof Error
    ? error.message
    : String(error ?? "Unknown error");

  const details: Record<string, unknown> = {
    ...(context?.details ?? {}),
  };

  if (error instanceof Error && error.stack) {
    details.stack = error.stack;
    details.name = error.name;
  }

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, {
      tags: { source },
      extra: details,
    });
  } catch {
    // Ignore Sentry transport/setup issues and keep local logging.
  }

  await logAppEvent({
    level: "error",
    source,
    message,
    path: context?.path,
    userId: context?.userId,
    ip: context?.ip,
    details,
  });
}
