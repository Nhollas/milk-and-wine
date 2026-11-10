import { DatabaseSync } from "node:sqlite";

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      loan_id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      copy_id TEXT NOT NULL,
      lent_on TEXT NOT NULL,
      due_on TEXT NOT NULL,
      returned_on TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_current_loan_per_copy ON loans (copy_id) WHERE returned_on IS NULL;
    CREATE TABLE IF NOT EXISTS reminders (
      loan_id TEXT NOT NULL REFERENCES loans (loan_id),
      sent_on TEXT NOT NULL,
      PRIMARY KEY (loan_id, sent_on)
    );
  `);
  return db;
}
