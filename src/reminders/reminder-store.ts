import type { DatabaseSync } from "node:sqlite";
import type { OverdueReminder } from "./notifications-client.ts";

type OverdueRecord = { loan_id: string; member_id: string; due_on: string };

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
        .all(today, today) as OverdueRecord[];
      return records.map((record) => ({
        loanId: record.loan_id,
        memberId: record.member_id,
        dueOn: record.due_on,
      }));
    },

    recordSent(loanId: string, sentOn: string): void {
      db.prepare("INSERT INTO reminders (loan_id, sent_on) VALUES (?, ?)").run(loanId, sentOn);
    },
  };
}
