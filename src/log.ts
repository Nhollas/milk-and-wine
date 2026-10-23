export type LogLevel = "info" | "warn" | "error";

export type Log = (level: LogLevel, event: string, fields?: Record<string, unknown>) => void;

export const stdoutLog: Log = (level, event, fields = {}) => {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })}\n`);
};
