import { expect, test } from "vitest";
import { fakeCatalogue } from "../support/fake-catalogue.ts";
import { fakeNotifications } from "../support/fake-notifications.ts";
import { createTestLibrary } from "../support/test-library.ts";

test("B1: a member borrows an available copy, due in 14 days, and no one else can borrow it", async () => {
  fakeCatalogue({ "copy-1": "available" });
  const library = createTestLibrary("2026-03-02");

  const lent = await library.lend("ada", "copy-1");
  const refused = await library.lend("grace", "copy-1");

  expect(lent.status).toBe(201);
  expect(lent.body["dueOn"]).toBe("2026-03-16");
  expect(refused.status).toBe(409);
});

test("B2: once a member returns a copy, the next member can borrow it", async () => {
  fakeCatalogue({ "copy-1": "available" });
  const library = createTestLibrary("2026-03-02");
  const first = await library.lend("ada", "copy-1");

  await library.returnLoan(String(first.body["loanId"]));
  const next = await library.lend("grace", "copy-1");

  expect(next.status).toBe(201);
  expect(next.body["memberId"]).toBe("grace");
});

test("B3: a member who keeps a copy past its due date gets one reminder that day", async () => {
  fakeCatalogue({ "copy-1": "available" });
  const notifications = fakeNotifications();
  const library = createTestLibrary("2026-03-02");
  await library.lend("ada", "copy-1");

  library.setToday("2026-03-16");
  await library.sweep();
  library.setToday("2026-03-17");
  await library.sweep();
  await library.sweep();

  expect(notifications.received).toEqual([
    { memberId: "ada", template: "loan-overdue", data: { loanId: expect.any(String), dueOn: "2026-03-16" } },
  ]);
});

test.todo("B4: a renewed loan is due 14 days later and gets no reminder before then");
