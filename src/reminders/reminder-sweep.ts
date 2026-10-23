import type { DatabaseSync } from "node:sqlite";
import { type Clock, utcDate } from "../clock.ts";
import type { Logger } from "../log.ts";
import type { NotificationsClient } from "./notifications-client.ts";
import { createReminderStore } from "./reminder-store.ts";

export type ReminderSweepOptions = {
  db: DatabaseSync;
  notificationsClient: NotificationsClient;
  clock: Clock;
  logger: Logger;
};

export type SweepSummary = { sent: number; failed: number };

export function createReminderSweep({
  db,
  notificationsClient,
  clock,
  logger,
}: ReminderSweepOptions) {
  const store = createReminderStore(db);

  return async function sweep(): Promise<SweepSummary> {
    const today = utcDate(clock());
    const summary: SweepSummary = { sent: 0, failed: 0 };

    for (const reminder of store.remindersDue(today)) {
      try {
        await notificationsClient.sendOverdueReminder(reminder);
      } catch (error) {
        summary.failed++;
        logger.warn("reminder.failed", { loanId: reminder.loanId, error: String(error) });
        continue;
      }
      store.recordSent(reminder.loanId, today);
      summary.sent++;
    }

    logger.info("reminders.swept", { ...summary });
    return summary;
  };
}
