export type LogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

export type LogEntry = { level: LogLevel; event: string; fields: LogFields };

export type Logger = Record<LogLevel, (event: string, fields?: LogFields) => void>;

export function createLogger(write: (entry: LogEntry) => void): Logger {
  const logAt =
    (level: LogLevel) =>
    (event: string, fields: LogFields = {}) =>
      write({ level, event, fields });
  return { info: logAt("info"), warn: logAt("warn"), error: logAt("error") };
}

export const logger = createLogger(({ level, event, fields }) => {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })}\n`);
});
