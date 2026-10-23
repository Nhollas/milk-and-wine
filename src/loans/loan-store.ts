import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";

export type Loan = z.output<typeof loanRecord>;

type LoanInsert = { kind: "inserted" } | { kind: "copy-on-loan" };

const SQLITE_CONSTRAINT_UNIQUE = 2067;

const loanRecord = z
  .object({
    loan_id: z.string(),
    member_id: z.string(),
    copy_id: z.string(),
    lent_on: z.iso.date(),
    due_on: z.iso.date(),
    returned_on: z.iso.date().nullable(),
  })
  .transform((record) => ({
    loanId: record.loan_id,
    memberId: record.member_id,
    copyId: record.copy_id,
    lentOn: record.lent_on,
    dueOn: record.due_on,
    returnedOn: record.returned_on,
  }));

export function createLoanStore(db: DatabaseSync) {
  return {
    hasOpenLoan(copyId: string): boolean {
      return (
        db.prepare("SELECT 1 FROM loans WHERE copy_id = ? AND returned_on IS NULL").get(copyId) !==
        undefined
      );
    },

    insert(loan: Loan): LoanInsert {
      try {
        db.prepare(
          "INSERT INTO loans (loan_id, member_id, copy_id, lent_on, due_on, returned_on) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(loan.loanId, loan.memberId, loan.copyId, loan.lentOn, loan.dueOn, loan.returnedOn);
      } catch (error) {
        if (isUniqueViolation(error)) return { kind: "copy-on-loan" };
        throw error;
      }
      return { kind: "inserted" };
    },

    find(loanId: string): Loan | undefined {
      const row = db.prepare("SELECT * FROM loans WHERE loan_id = ?").get(loanId);
      return row && loanRecord.parse(row);
    },

    markReturned(loanId: string, returnedOn: string): void {
      db.prepare("UPDATE loans SET returned_on = ? WHERE loan_id = ?").run(returnedOn, loanId);
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && "errcode" in error && error.errcode === SQLITE_CONSTRAINT_UNIQUE;
}
