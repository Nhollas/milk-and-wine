import type { DatabaseSync } from "node:sqlite";
import type { OverdueReminder } from "./notifications-client.ts";

type OverdueRow = { loan_id: string; member_id: string; due_on: string };

export function createReminderStore(db: DatabaseSync) {
  return {
    overdueWithoutReminder(today: string): OverdueReminder[] {
      const rows = db
        .prepare(
          `SELECT loan_id, member_id, due_on FROM loans
           WHERE returned_on IS NULL AND due_on < ?
             AND NOT EXISTS (SELECT 1 FROM reminders WHERE reminders.loan_id = loans.loan_id AND sent_on = ?)
           ORDER BY due_on, loan_id`,
        )
        .all(today, today) as OverdueRow[];
      return rows.map((row) => ({ loanId: row.loan_id, memberId: row.member_id, dueOn: row.due_on }));
    },

    record(loanId: string, sentOn: string): void {
      db.prepare("INSERT INTO reminders (loan_id, sent_on) VALUES (?, ?)").run(loanId, sentOn);
    },
  };
}
