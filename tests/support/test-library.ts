import { openDatabase } from "../../src/database.ts";
import type { Log, LogLevel } from "../../src/log.ts";
import { createLoansApp } from "../../src/loans/loans-app.ts";
import { createReminderSweep } from "../../src/reminders/reminder-sweep.ts";
import { CATALOGUE_URL } from "./fake-catalogue.ts";
import { NOTIFY_URL } from "./fake-notifications.ts";

export type LogEntry = { level: LogLevel; event: string; fields: Record<string, unknown> };

export function createTestLibrary(today = "2026-03-02") {
  let now = new Date(`${today}T10:00:00Z`);
  const logs: LogEntry[] = [];
  const log: Log = (level, event, fields = {}) => logs.push({ level, event, fields });
  const db = openDatabase(":memory:");
  const clock = () => now;
  const app = createLoansApp({ db, catalogueUrl: CATALOGUE_URL, clock });
  const sweep = createReminderSweep({ db, notifyUrl: NOTIFY_URL, clock, log });

  return {
    db,
    logs,
    sweep,
    setToday(date: string) {
      now = new Date(`${date}T10:00:00Z`);
    },
    async lend(memberId: unknown, copyId: unknown) {
      return sendJson("POST", "/loans", { memberId, copyId });
    },
    async returnLoan(loanId: string) {
      return sendJson("POST", `/loans/${loanId}/return`);
    },
    async request(method: string, path: string, body?: string) {
      const response = await app.request(path, body === undefined ? { method } : { method, body });
      return { status: response.status, body: await response.json() };
    },
  };

  async function sendJson(method: string, path: string, body?: unknown) {
    const response = await app.request(path, {
      method,
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  }
}
