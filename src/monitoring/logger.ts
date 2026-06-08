export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export interface LogContext {
  [key: string]: unknown;
}

function resolveMinLevel(): LogLevel {
  const fromEnv = process.env.LOG_LEVEL?.toLowerCase();

  if (
    fromEnv === "debug" ||
    fromEnv === "info" ||
    fromEnv === "warn" ||
    fromEnv === "error"
  ) {
    return fromEnv;
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[resolveMinLevel()];
}

function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    const payload: LogContext = {
      name: error.name,
      message: error.message
    };

    if (isDevelopment() && error.stack) {
      payload.stack = error.stack;
    }

    return payload;
  }

  return { value: String(error) };
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `${timestamp} [${level.toUpperCase()}] ${message}`;
  const payload =
    context && Object.keys(context).length > 0
      ? `${line} ${JSON.stringify(context)}`
      : line;

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    write("debug", message, context);
  },

  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },

  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },

  error(message: string, error?: unknown, context?: LogContext): void {
    const merged: LogContext = { ...context };

    if (error !== undefined) {
      Object.assign(merged, serializeError(error));
    }

    write("error", message, merged);
  }
};