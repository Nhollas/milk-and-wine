import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { Hono } from "hono";
import { z } from "zod";
import type { CatalogueClient } from "@milk-and-wine/catalogue-client";
import { addDays, type Clock, utcDate } from "@milk-and-wine/platform/clock";
import { createLoanStore, type Loan } from "./loan-store.ts";

const LOAN_DAYS = 14;

const lendRequestSchema = z.object({
  memberId: z.string().min(1),
  copyId: z.string().min(1),
});

export type LoansAppOptions = {
  db: DatabaseSync;
  catalogueClient: CatalogueClient;
  clock: Clock;
};

export function createLoansApp({ db, catalogueClient, clock }: LoansAppOptions): Hono {
  const store = createLoanStore(db);
  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/loans", async (c) => {
    const parsed = lendRequestSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!parsed.success) return c.json({ error: "invalid-request" }, 400);
    const { memberId, copyId } = parsed.data;

    if (store.hasCurrentLoan(copyId)) return c.json({ error: "copy-on-loan" }, 409);

    const lookup = await catalogueClient.getCopy(copyId);
    if (lookup.kind === "failed") return c.json({ error: "catalogue-unavailable" }, 503);
    if (lookup.kind === "not-found") return c.json({ error: "copy-not-found" }, 404);
    if (!lookup.copy.available) return c.json({ error: "copy-withdrawn" }, 422);

    const lentOn = utcDate(clock());
    const loan: Loan = {
      loanId: randomUUID(),
      memberId,
      copyId,
      lentOn,
      dueOn: addDays(lentOn, LOAN_DAYS),
      returnedOn: null,
    };
    if (store.insert(loan).kind === "copy-on-loan") return c.json({ error: "copy-on-loan" }, 409);
    return c.json(
      { loanId: loan.loanId, memberId, copyId, lentOn: loan.lentOn, dueOn: loan.dueOn },
      201,
    );
  });

  app.post("/loans/:loanId/return", (c) => {
    const loan = store.find(c.req.param("loanId"));
    if (!loan) return c.json({ error: "loan-not-found" }, 404);
    if (loan.returnedOn !== null) return c.json({ error: "already-returned" }, 409);

    const returnedOn = utcDate(clock());
    store.markReturned(loan.loanId, returnedOn);
    return c.json({ ...loan, returnedOn }, 200);
  });

  return app;
}
