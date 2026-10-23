import type { DatabaseSync } from "node:sqlite";

export type Loan = {
  loanId: string;
  memberId: string;
  copyId: string;
  lentOn: string;
  dueOn: string;
  returnedOn: string | null;
};

export class CopyOnLoan extends Error {}

const SQLITE_CONSTRAINT_UNIQUE = 2067;

type LoanRecord = {
  loan_id: string;
  member_id: string;
  copy_id: string;
  lent_on: string;
  due_on: string;
  returned_on: string | null;
};

export function createLoanStore(db: DatabaseSync) {
  return {
    hasOpenLoan(copyId: string): boolean {
      return (
        db.prepare("SELECT 1 FROM loans WHERE copy_id = ? AND returned_on IS NULL").get(copyId) !==
        undefined
      );
    },

    insert(loan: Loan): void {
      try {
        db.prepare(
          "INSERT INTO loans (loan_id, member_id, copy_id, lent_on, due_on, returned_on) VALUES (?, ?, ?, ?, ?, ?)",
        ).run(loan.loanId, loan.memberId, loan.copyId, loan.lentOn, loan.dueOn, loan.returnedOn);
      } catch (error) {
        if (isUniqueViolation(error)) throw new CopyOnLoan(loan.copyId);
        throw error;
      }
    },

    find(loanId: string): Loan | undefined {
      const record = db.prepare("SELECT * FROM loans WHERE loan_id = ?").get(loanId) as
        | LoanRecord
        | undefined;
      return (
        record && {
          loanId: record.loan_id,
          memberId: record.member_id,
          copyId: record.copy_id,
          lentOn: record.lent_on,
          dueOn: record.due_on,
          returnedOn: record.returned_on,
        }
      );
    },

    markReturned(loanId: string, returnedOn: string): void {
      db.prepare("UPDATE loans SET returned_on = ? WHERE loan_id = ?").run(returnedOn, loanId);
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && "errcode" in error && error.errcode === SQLITE_CONSTRAINT_UNIQUE;
}
