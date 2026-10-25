import { expect } from "vitest";
import { postJson } from "../../tests/support/json-requests.ts";
import { test } from "../../tests/support/service.fixtures.ts";

test("B1: asks for a reminder for each overdue loan and records it for today", async ({
  app,
  sendOverdueReminders,
  clock,
  db,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available", "copy-2": "available" });
  clock.setToday("2026-03-02");
  const firstLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId: loan1 } = (await firstLendResponse.json()) as { loanId: string };
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-2" }),
  );
  const { loanId: loan2 } = (await secondLendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toEqual(
    expect.arrayContaining([
      { memberId: "member-1", loanId: loan1, dueOn: "2026-03-16" },
      { memberId: "member-2", loanId: loan2, dueOn: "2026-03-16" },
    ]),
  );
  expect(fakeNotifications.sent).toHaveLength(2);
  const reminders = db.prepare("SELECT loan_id, sent_on FROM reminders").all();
  expect(reminders).toEqual(
    expect.arrayContaining([
      { loan_id: loan1, sent_on: "2026-03-17" },
      { loan_id: loan2, sent_on: "2026-03-17" },
    ]),
  );
  expect(reminders).toHaveLength(2);
});

test("B2: sends nothing for loans already reminded today, returned, or not yet overdue", async ({
  app,
  sendOverdueReminders,
  clock,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({
    "copy-1": "available",
    "copy-2": "available",
    "copy-3": "available",
  });
  clock.setToday("2026-03-02");
  const firstLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId: loan1 } = (await firstLendResponse.json()) as { loanId: string };
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-2" }),
  );
  const { loanId: loan2 } = (await secondLendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-03");
  await app.request("/loans", postJson({ memberId: "member-3", copyId: "copy-3" }));
  clock.setToday("2026-03-17");
  await app.request(`/loans/${loan2}/return`, postJson());

  await sendOverdueReminders();
  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan1 }]);
});

test("B3: records nothing for a refused reminder and carries on with the other loans", async ({
  app,
  sendOverdueReminders,
  clock,
  db,
  logs,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available", "copy-2": "available" });
  clock.setToday("2026-03-01");
  const firstLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId: loan1 } = (await firstLendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-02");
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-2" }),
  );
  const { loanId: loan2 } = (await secondLendResponse.json()) as { loanId: string };
  fakeNotifications.refuseFor(loan1, "Notifications API answered 503");
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan2 }]);
  expect(db.prepare("SELECT loan_id, sent_on FROM reminders").all()).toEqual([
    { loan_id: loan2, sent_on: "2026-03-17" },
  ]);
  expect(logs).toContainEqual({
    level: "warn",
    event: "reminder.failed",
    fields: { loanId: loan1, error: "Notifications API answered 503" },
  });
});

test("B4: logs how many reminders were sent and how many failed", async ({
  app,
  sendOverdueReminders,
  clock,
  logs,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({
    "copy-1": "available",
    "copy-2": "available",
    "copy-3": "available",
  });
  clock.setToday("2026-03-02");
  await app.request("/loans", postJson({ memberId: "member-1", copyId: "copy-1" }));
  await app.request("/loans", postJson({ memberId: "member-2", copyId: "copy-2" }));
  const thirdLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-3", copyId: "copy-3" }),
  );
  const { loanId: loan3 } = (await thirdLendResponse.json()) as { loanId: string };
  fakeNotifications.refuseFor(loan3, "Notifications API answered 503");
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(logs.at(-1)).toEqual({
    level: "info",
    event: "reminders.finished",
    fields: { sent: 2, failed: 1 },
  });
});
