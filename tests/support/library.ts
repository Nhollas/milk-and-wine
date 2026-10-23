import type { CatalogueClient } from "../../src/catalogue/catalogue-client.ts";
import { openDatabase } from "../../src/database.ts";
import { createLogger, type LogEntry } from "../../src/log.ts";
import { createLoansApp } from "../../src/loans/loans-app.ts";
import type { NotificationsClient } from "../../src/reminders/notifications-client.ts";
import { createReminderSweep } from "../../src/reminders/reminder-sweep.ts";

export type Library = ReturnType<typeof openLibrary>;

export type LibraryDependencies = { catalogueClient: CatalogueClient; notificationsClient: NotificationsClient };

export function openLibrary({ catalogueClient, notificationsClient }: LibraryDependencies, today = "2026-03-02") {
  let now = new Date(`${today}T10:00:00Z`);
  const logs: LogEntry[] = [];
  const logger = createLogger((entry) => logs.push(entry));
  const db = openDatabase(":memory:");
  const clock = () => now;
  const app = createLoansApp({ db, catalogueClient, clock });
  const sweep = createReminderSweep({ db, notificationsClient, clock, logger });

  return {
    db,
    logs,
    sweep,
    close() {
      if (db.isOpen) db.close();
    },
    setToday(date: string) {
      now = new Date(`${date}T10:00:00Z`);
    },
    async lend(memberId: unknown, copyId: unknown) {
      return sendJson("POST", "/loans", { memberId, copyId });
    },
    async lendForLoanId(memberId: string, copyId: string) {
      const { body } = await sendJson("POST", "/loans", { memberId, copyId });
      return String(body["loanId"]);
    },
    loanCount() {
      return (db.prepare("SELECT COUNT(*) AS count FROM loans").get() as { count: number }).count;
    },
    remindersRecorded() {
      return db.prepare("SELECT loan_id AS loanId, sent_on AS sentOn FROM reminders ORDER BY loan_id").all();
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
