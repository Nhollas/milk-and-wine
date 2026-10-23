import type { DatabaseSync } from "node:sqlite";

export type Loan = {
  loanId: string;
  memberId: string;
  copyId: string;
  lentOn: string;
  dueOn: string;
  returnedOn: string | null;
};

export type LoanStore = ReturnType<typeof createLoanStore>;

export class CopyOnLoan extends Error {}

const SQLITE_CONSTRAINT_UNIQUE = 2067;

type LoanRow = {
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
      return db.prepare("SELECT 1 FROM loans WHERE copy_id = ? AND returned_on IS NULL").get(copyId) !== undefined;
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
      const row = db.prepare("SELECT * FROM loans WHERE loan_id = ?").get(loanId) as LoanRow | undefined;
      return row && {
        loanId: row.loan_id,
        memberId: row.member_id,
        copyId: row.copy_id,
        lentOn: row.lent_on,
        dueOn: row.due_on,
        returnedOn: row.returned_on,
      };
    },

    markReturned(loanId: string, returnedOn: string): void {
      db.prepare("UPDATE loans SET returned_on = ? WHERE loan_id = ?").run(returnedOn, loanId);
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && "errcode" in error && error.errcode === SQLITE_CONSTRAINT_UNIQUE;
}
