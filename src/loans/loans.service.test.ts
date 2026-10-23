import { expect } from "vitest";
import { test } from "../../tests/support/service.fixtures.ts";

test("B10: refuses a request that isn't JSON or lacks an ID, asking the catalogue nothing", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "available" });

  expect(await library.lend("member-1", "")).toEqual({ status: 400, body: { error: "invalid-request" } });
  expect(await library.lend(undefined, "copy-1")).toEqual({ status: 400, body: { error: "invalid-request" } });
  expect(await library.request("POST", "/loans", "not json")).toEqual({
    status: 400,
    body: { error: "invalid-request" },
  });
  expect(catalogueClient.lookups).toEqual([]);
});

test("B1: lends an available copy, due 14 days after today", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "available" });
  library.setToday("2026-03-02");

  const { status, body } = await library.lend("member-1", "copy-1");

  expect(status).toBe(201);
  expect(body).toEqual({
    loanId: expect.any(String),
    memberId: "member-1",
    copyId: "copy-1",
    lentOn: "2026-03-02",
    dueOn: "2026-03-16",
  });
});

test("B2: refuses a copy that is already on loan", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "available" });
  await library.lend("member-1", "copy-1");

  expect(await library.lend("member-2", "copy-1")).toEqual({ status: 409, body: { error: "copy-on-loan" } });
  expect(library.loanCount()).toBe(1);
});

test("B3: refuses a withdrawn copy", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "withdrawn" });

  expect(await library.lend("member-1", "copy-1")).toEqual({ status: 422, body: { error: "copy-withdrawn" } });
  expect(library.loanCount()).toBe(0);
});

test("B4: refuses a copy the catalogue doesn't know", async ({ library }) => {
  expect(await library.lend("member-1", "copy-9")).toEqual({ status: 404, body: { error: "copy-not-found" } });
  expect(library.loanCount()).toBe(0);
});

test("B5: refuses to lend while the catalogue is unavailable", async ({ library, catalogueClient }) => {
  catalogueClient.becomeUnavailable();

  expect(await library.lend("member-1", "copy-1")).toEqual({
    status: 503,
    body: { error: "catalogue-unavailable" },
  });
  expect(library.loanCount()).toBe(0);
});

test("B6: takes back an open loan so the copy can be lent again", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "available" });
  library.setToday("2026-03-02");
  const lent = await library.lend("member-1", "copy-1");
  library.setToday("2026-03-05");

  const returned = await library.returnLoan(String(lent.body["loanId"]));

  expect(returned).toEqual({ status: 200, body: { ...lent.body, returnedOn: "2026-03-05" } });
  expect((await library.lend("member-2", "copy-1")).status).toBe(201);
});

test("B7: refuses to take back an unknown or already returned loan", async ({ library, catalogueClient }) => {
  catalogueClient.addCopies({ "copy-1": "available" });
  const loanId = await library.lendForLoanId("member-1", "copy-1");
  await library.returnLoan(loanId);

  expect(await library.returnLoan("no-such-loan")).toEqual({ status: 404, body: { error: "loan-not-found" } });
  expect(await library.returnLoan(loanId)).toEqual({ status: 409, body: { error: "already-returned" } });
});

test.todo("B8: renews an open loan to 14 days past its due date");

test.todo("B9: refuses to renew an overdue loan or one renewed twice");

test("B11: reports healthy without touching the catalogue or the database", async ({ library }) => {
  library.db.close();

  expect(await library.request("GET", "/health")).toEqual({ status: 200, body: { status: "ok" } });
});
