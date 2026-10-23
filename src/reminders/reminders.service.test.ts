import { expect, test } from "vitest";
import { fakeCatalogue } from "../../tests/support/fake-catalogue.ts";
import { fakeNotifications } from "../../tests/support/fake-notifications.ts";
import { createLibrary } from "../../tests/support/library.ts";

async function libraryWithLoans(copies: string[], lentOn = "2026-03-02") {
  fakeCatalogue(Object.fromEntries(copies.map((copyId) => [copyId, "available" as const])));
  const library = createLibrary(lentOn);
  const loanIds: string[] = [];
  for (const [index, copyId] of copies.entries()) {
    const { body } = await library.lend(`member-${index + 1}`, copyId);
    loanIds.push(String(body["loanId"]));
  }
  return { library, loanIds };
}

function remindersRecorded(library: ReturnType<typeof createLibrary>) {
  return library.db.prepare("SELECT loan_id AS loanId, sent_on AS sentOn FROM reminders ORDER BY loan_id").all();
}

test("B1: asks for a reminder for each overdue loan and records it for today", async () => {
  const { library, loanIds } = await libraryWithLoans(["copy-1", "copy-2"]);
  const notifications = fakeNotifications();
  library.setToday("2026-03-17");

  await library.sweep();

  expect(notifications.received).toEqual(
    expect.arrayContaining([
      { memberId: "member-1", template: "loan-overdue", data: { loanId: loanIds[0], dueOn: "2026-03-16" } },
      { memberId: "member-2", template: "loan-overdue", data: { loanId: loanIds[1], dueOn: "2026-03-16" } },
    ]),
  );
  expect(notifications.received).toHaveLength(2);
  expect(remindersRecorded(library)).toHaveLength(2);
});

test("B2: sends nothing for loans already reminded today, returned, or not yet overdue", async () => {
  const { library, loanIds } = await libraryWithLoans(["copy-1", "copy-2"]);
  const { library: notDue } = await libraryWithLoans(["copy-3"], "2026-03-10");
  const notifications = fakeNotifications();
  library.setToday("2026-03-17");
  notDue.setToday("2026-03-17");
  await library.returnLoan(String(loanIds[1]));

  await library.sweep();
  await library.sweep();
  await notDue.sweep();

  expect(notifications.received.map((notification) => notification.data.loanId)).toEqual([loanIds[0]]);
});

test("B3: records nothing for a refused reminder and carries on with the other loans", async () => {
  const { library, loanIds } = await libraryWithLoans(["copy-1", "copy-2"]);
  const notifications = fakeNotifications({ refuseFor: [String(loanIds[0])] });
  library.setToday("2026-03-17");

  await library.sweep();

  expect(notifications.received.map((notification) => notification.data.loanId)).toEqual([loanIds[1]]);
  expect(remindersRecorded(library)).toEqual([{ loanId: loanIds[1], sentOn: "2026-03-17" }]);
  expect(library.logs).toContainEqual({
    level: "warn",
    event: "reminder.failed",
    fields: { loanId: loanIds[0], error: expect.any(String) },
  });
});

test("B4: logs how many reminders were sent and how many failed", async () => {
  const { library, loanIds } = await libraryWithLoans(["copy-1", "copy-2", "copy-3"]);
  fakeNotifications({ refuseFor: [String(loanIds[2])] });
  library.setToday("2026-03-17");

  await library.sweep();

  expect(library.logs.at(-1)).toEqual({ level: "info", event: "reminders.swept", fields: { sent: 2, failed: 1 } });
});
