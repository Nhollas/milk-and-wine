import type { DatabaseSync } from "node:sqlite";
import { type Clock, utcDate } from "../clock.ts";
import type { Log } from "../log.ts";
import { createNotificationsClient } from "./notifications-client.ts";
import { createReminderStore } from "./reminder-store.ts";

export type ReminderSweepOptions = {
  db: DatabaseSync;
  notifyUrl: string;
  clock: Clock;
  log: Log;
};

export type SweepSummary = { sent: number; failed: number };

export function createReminderSweep({ db, notifyUrl, clock, log }: ReminderSweepOptions) {
  const store = createReminderStore(db);
  const notifications = createNotificationsClient(notifyUrl);

  return async function sweep(): Promise<SweepSummary> {
    const today = utcDate(clock());
    const summary: SweepSummary = { sent: 0, failed: 0 };

    for (const reminder of store.overdueWithoutReminder(today)) {
      try {
        await notifications.sendOverdueReminder(reminder);
      } catch (error) {
        summary.failed++;
        log("warn", "reminder.failed", { loanId: reminder.loanId, error: String(error) });
        continue;
      }
      store.record(reminder.loanId, today);
      summary.sent++;
    }

    log("info", "reminders.swept", { ...summary });
    return summary;
  };
}
