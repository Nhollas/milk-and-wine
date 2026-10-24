import { expect } from "vitest";
import { test } from "../../tests/support/service.fixtures.ts";

test("B1: asks for a reminder for each overdue loan and records it for today", async ({
  library,
  catalogueClient,
  notificationsClient,
}) => {
  catalogueClient.addCopies({ "copy-1": "available", "copy-2": "available" });
  library.setToday("2026-03-02");
  const loan1 = await library.lendForLoanId("member-1", "copy-1");
  const loan2 = await library.lendForLoanId("member-2", "copy-2");
  library.setToday("2026-03-17");

  await library.sendOverdueReminders();

  expect(notificationsClient.sent).toEqual(
    expect.arrayContaining([
      { memberId: "member-1", loanId: loan1, dueOn: "2026-03-16" },
      { memberId: "member-2", loanId: loan2, dueOn: "2026-03-16" },
    ]),
  );
  expect(notificationsClient.sent).toHaveLength(2);
  expect(library.remindersRecorded()).toHaveLength(2);
});

test("B2: sends nothing for loans already reminded today, returned, or not yet overdue", async ({
  library,
  catalogueClient,
  notificationsClient,
}) => {
  catalogueClient.addCopies({
    "copy-1": "available",
    "copy-2": "available",
    "copy-3": "available",
  });
  library.setToday("2026-03-02");
  const loan1 = await library.lendForLoanId("member-1", "copy-1");
  const loan2 = await library.lendForLoanId("member-2", "copy-2");
  library.setToday("2026-03-10");
  await library.lend("member-3", "copy-3");
  library.setToday("2026-03-17");
  await library.returnLoan(loan2);

  await library.sendOverdueReminders();
  await library.sendOverdueReminders();

  expect(notificationsClient.sent.map((reminder) => reminder.loanId)).toEqual([loan1]);
});

test("B3: records nothing for a refused reminder and carries on with the other loans", async ({
  library,
  catalogueClient,
  notificationsClient,
}) => {
  catalogueClient.addCopies({ "copy-1": "available", "copy-2": "available" });
  library.setToday("2026-03-02");
  const loan1 = await library.lendForLoanId("member-1", "copy-1");
  const loan2 = await library.lendForLoanId("member-2", "copy-2");
  notificationsClient.refuseFor(loan1);
  library.setToday("2026-03-17");

  await library.sendOverdueReminders();

  expect(notificationsClient.sent.map((reminder) => reminder.loanId)).toEqual([loan2]);
  expect(library.remindersRecorded()).toEqual([{ loanId: loan2, sentOn: "2026-03-17" }]);
  expect(library.logs).toContainEqual({
    level: "warn",
    event: "reminder.failed",
    fields: { loanId: loan1, error: expect.any(String) },
  });
});

test("B4: logs how many reminders were sent and how many failed", async ({
  library,
  catalogueClient,
  notificationsClient,
}) => {
  catalogueClient.addCopies({
    "copy-1": "available",
    "copy-2": "available",
    "copy-3": "available",
  });
  library.setToday("2026-03-02");
  await library.lend("member-1", "copy-1");
  await library.lend("member-2", "copy-2");
  const loan3 = await library.lendForLoanId("member-3", "copy-3");
  notificationsClient.refuseFor(loan3);
  library.setToday("2026-03-17");

  await library.sendOverdueReminders();

  expect(library.logs.at(-1)).toEqual({
    level: "info",
    event: "reminders.finished",
    fields: { sent: 2, failed: 1 },
  });
});
