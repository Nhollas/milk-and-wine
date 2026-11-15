import { expect } from "vitest";
import { postJson } from "../../tests/support/json-requests.ts";
import { test } from "../../tests/support/unit.fixtures.ts";

test("B10: refuses a request that isn't JSON or lacks an ID, asking the catalogue nothing", async ({
  app,
  fakeCatalogue,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });

  const emptyCopyIdResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "" }),
  );
  const emptyMemberIdResponse = await app.request(
    "/loans",
    postJson({ memberId: "", copyId: "copy-1" }),
  );
  const missingMemberIdResponse = await app.request("/loans", postJson({ copyId: "copy-1" }));
  const notJsonResponse = await app.request("/loans", { method: "POST", body: "not json" });

  expect(emptyCopyIdResponse.status).toBe(400);
  expect(await emptyCopyIdResponse.json()).toEqual({ error: "invalid-request" });
  expect(emptyMemberIdResponse.status).toBe(400);
  expect(await emptyMemberIdResponse.json()).toEqual({ error: "invalid-request" });
  expect(missingMemberIdResponse.status).toBe(400);
  expect(await missingMemberIdResponse.json()).toEqual({ error: "invalid-request" });
  expect(notJsonResponse.status).toBe(400);
  expect(await notJsonResponse.json()).toEqual({ error: "invalid-request" });
  expect(fakeCatalogue.lookups).toEqual([]);
});

test("B1: lends an available copy, due 14 days after today", async ({
  app,
  fakeCatalogue,
  clock,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-02");

  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );

  expect(lendResponse.status).toBe(201);
  expect(await lendResponse.json()).toEqual({
    loanId: expect.any(String),
    memberId: "member-1",
    copyId: "copy-1",
    lentOn: "2026-03-02",
    dueOn: "2026-03-16",
  });
});

test("B2: refuses a copy that is already on loan, asking the catalogue nothing", async ({
  app,
  fakeCatalogue,
  db,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  await app.request("/loans", postJson({ memberId: "member-1", copyId: "copy-1" }));

  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-1" }),
  );

  expect(secondLendResponse.status).toBe(409);
  expect(await secondLendResponse.json()).toEqual({ error: "copy-on-loan" });
  expect(db.prepare("SELECT member_id, copy_id FROM loans").all()).toEqual([
    { member_id: "member-1", copy_id: "copy-1" },
  ]);
  expect(fakeCatalogue.lookups).toEqual(["copy-1"]);
});

test("B15: lends a copy to one of two requests at once, and refuses the other", async ({
  app,
  fakeCatalogue,
  db,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });

  const [firstLendResponse, secondLendResponse] = await Promise.all([
    app.request("/loans", postJson({ memberId: "member-1", copyId: "copy-1" })),
    app.request("/loans", postJson({ memberId: "member-2", copyId: "copy-1" })),
  ]);

  expect(firstLendResponse.status).toBe(201);
  expect(secondLendResponse.status).toBe(409);
  expect(await secondLendResponse.json()).toEqual({ error: "copy-on-loan" });
  expect(db.prepare("SELECT member_id FROM loans").all()).toEqual([{ member_id: "member-1" }]);
});

test("B3: refuses a withdrawn copy", async ({ app, fakeCatalogue, db }) => {
  fakeCatalogue.addCopies({ "copy-1": "withdrawn" });

  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );

  expect(lendResponse.status).toBe(422);
  expect(await lendResponse.json()).toEqual({ error: "copy-withdrawn" });
  expect(db.prepare("SELECT * FROM loans").all()).toEqual([]);
});

test("B4: refuses a copy the catalogue doesn't know", async ({ app, db }) => {
  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-9" }),
  );

  expect(lendResponse.status).toBe(404);
  expect(await lendResponse.json()).toEqual({ error: "copy-not-found" });
  expect(db.prepare("SELECT * FROM loans").all()).toEqual([]);
});

test("B5: refuses to lend while the catalogue is unavailable", async ({
  app,
  fakeCatalogue,
  db,
}) => {
  fakeCatalogue.becomeUnavailable();

  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );

  expect(lendResponse.status).toBe(503);
  expect(await lendResponse.json()).toEqual({ error: "catalogue-unavailable" });
  expect(db.prepare("SELECT * FROM loans").all()).toEqual([]);
});

test("B6: takes back a current loan so the copy can be lent again", async ({
  app,
  fakeCatalogue,
  clock,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-02");
  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const loan = (await lendResponse.json()) as Record<string, unknown>;
  clock.setToday("2026-03-05");

  const returnResponse = await app.request(`/loans/${String(loan["loanId"])}/return`, postJson());
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-1" }),
  );

  expect(returnResponse.status).toBe(200);
  expect(await returnResponse.json()).toEqual({ ...loan, returnedOn: "2026-03-05" });
  expect(secondLendResponse.status).toBe(201);
});

test("B7: refuses to take back an unknown loan", async ({ app }) => {
  const unknownLoanReturnResponse = await app.request("/loans/no-such-loan/return", postJson());

  expect(unknownLoanReturnResponse.status).toBe(404);
  expect(await unknownLoanReturnResponse.json()).toEqual({ error: "loan-not-found" });
});

test("B13: refuses to take back a loan already returned, keeping its return date", async ({
  app,
  fakeCatalogue,
  clock,
  db,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-05");
  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId } = (await lendResponse.json()) as { loanId: string };
  await app.request(`/loans/${loanId}/return`, postJson());
  clock.setToday("2026-03-09");

  const secondReturnResponse = await app.request(`/loans/${loanId}/return`, postJson());

  expect(secondReturnResponse.status).toBe(409);
  expect(await secondReturnResponse.json()).toEqual({ error: "already-returned" });
  expect(db.prepare("SELECT returned_on FROM loans").all()).toEqual([
    { returned_on: "2026-03-05" },
  ]);
});

test.todo("B8: renews a current loan to 14 days past its due date");

test.todo("B9: refuses to renew an overdue loan");

test.todo("B14: refuses to renew a loan already renewed twice");

test("B11: reports healthy without touching the catalogue or the database", async ({
  app,
  db,
  fakeCatalogue,
}) => {
  db.close();

  const healthResponse = await app.request("/health");

  expect(healthResponse.status).toBe(200);
  expect(await healthResponse.json()).toEqual({ status: "ok" });
  expect(fakeCatalogue.lookups).toEqual([]);
});
