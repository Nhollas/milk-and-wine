import type { DatabaseSync } from "node:sqlite";
import { type Clock, utcDate } from "../clock.ts";
import type { Logger } from "../log.ts";
import type { NotificationsClient } from "./notifications-client.ts";
import { createReminderStore } from "./reminder-store.ts";

export type SendOverdueRemindersOptions = {
  db: DatabaseSync;
  notificationsClient: NotificationsClient;
  clock: Clock;
  logger: Logger;
};

export type ReminderCounts = { accepted: number; failed: number };

export async function sendOverdueReminders({
  db,
  notificationsClient,
  clock,
  logger,
}: SendOverdueRemindersOptions): Promise<ReminderCounts> {
  const store = createReminderStore(db);
  const today = utcDate(clock());
  const counts: ReminderCounts = { accepted: 0, failed: 0 };

  for (const reminder of store.remindersDue(today)) {
    const delivery = await notificationsClient.sendOverdueReminder(reminder);
    if (delivery.kind === "failed") {
      counts.failed++;
      logger.warn("reminder.failed", { loanId: reminder.loanId, error: delivery.reason });
      continue;
    }
    store.recordSent(reminder.loanId, today);
    counts.accepted++;
  }

  logger.info("reminders.finished", { ...counts });
  return counts;
}
