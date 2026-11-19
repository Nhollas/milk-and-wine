import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import type { OverdueReminder } from "@milk-and-wine/notifications-client";

const overdueRecord = z
  .object({ loan_id: z.string(), member_id: z.string(), due_on: z.iso.date() })
  .transform((record) => ({
    loanId: record.loan_id,
    memberId: record.member_id,
    dueOn: record.due_on,
  })) satisfies z.ZodType<OverdueReminder>;

export function createReminderStore(db: DatabaseSync) {
  return {
    remindersDue(today: string): OverdueReminder[] {
      const records = db
        .prepare(
          `SELECT loan_id, member_id, due_on FROM loans
           WHERE returned_on IS NULL AND due_on < ?
             AND NOT EXISTS (SELECT 1 FROM reminders WHERE reminders.loan_id = loans.loan_id AND sent_on = ?)
           ORDER BY due_on, loan_id`,
        )
        .all(today, today);
      return z.array(overdueRecord).parse(records);
    },

    recordSent(loanId: string, sentOn: string): void {
      db.prepare("INSERT INTO reminders (loan_id, sent_on) VALUES (?, ?)").run(loanId, sentOn);
    },
  };
}
