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

test("B1: judges a loan overdue by the UTC date, however late in the UTC day it is", async ({
  app,
  sendOverdueReminders,
  clock,
  db,
  timeZone,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available", "copy-2": "available" });
  clock.setToday("2026-03-02");
  const dueMarch16LendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId: dueMarch16 } = (await dueMarch16LendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-03");
  await app.request("/loans", postJson({ memberId: "member-2", copyId: "copy-2" }));
  timeZone.setTo("Pacific/Kiritimati");
  clock.setNow("2026-03-17T23:30:00Z");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: dueMarch16 }]);
  expect(db.prepare("SELECT loan_id, sent_on FROM reminders").all()).toEqual([
    { loan_id: dueMarch16, sent_on: "2026-03-17" },
  ]);
});

test("B1: reminds a loan again on a later day", async ({
  app,
  sendOverdueReminders,
  clock,
  db,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-02");
  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId } = (await lendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-17");
  await sendOverdueReminders();
  clock.setToday("2026-03-18");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toEqual([
    { memberId: "member-1", loanId, dueOn: "2026-03-16" },
    { memberId: "member-1", loanId, dueOn: "2026-03-16" },
  ]);
  expect(db.prepare("SELECT sent_on FROM reminders ORDER BY sent_on").all()).toEqual([
    { sent_on: "2026-03-17" },
    { sent_on: "2026-03-18" },
  ]);
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
    "copy-4": "available",
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
  await app.request("/loans", postJson({ memberId: "member-4", copyId: "copy-4" }));

  await sendOverdueReminders();
  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan1 }]);
});

test("B2: still reminds a loan when only another loan was reminded today", async ({
  app,
  sendOverdueReminders,
  clock,
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
  fakeNotifications.refuseFor(loan2, "Notifications API answered 503");
  clock.setToday("2026-03-17");
  await sendOverdueReminders();
  fakeNotifications.stopRefusing(loan2);

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan1 }, { loanId: loan2 }]);
});

test("B3: records nothing for a refused reminder, doesn't ask again, and carries on with the other loans", async ({
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

  expect(fakeNotifications.asked).toMatchObject([{ loanId: loan1 }, { loanId: loan2 }]);
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

  expect(logs).toEqual([
    {
      level: "warn",
      event: "reminder.failed",
      fields: { loanId: loan3, error: "Notifications API answered 503" },
    },
    { level: "info", event: "reminders.finished", fields: { sent: 2, failed: 1 } },
  ]);
});

test("B4: logs no reminders sent or failed when nothing is overdue", async ({
  app,
  sendOverdueReminders,
  clock,
  logs,
  fakeCatalogue,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-17");
  await app.request("/loans", postJson({ memberId: "member-1", copyId: "copy-1" }));

  await sendOverdueReminders();

  expect(logs.at(-1)).toEqual({
    level: "info",
    event: "reminders.finished",
    fields: { sent: 0, failed: 0 },
  });
});

test("B6: handles overdue loans oldest dueOn first", async ({
  app,
  sendOverdueReminders,
  clock,
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
  clock.setToday("2026-03-01");
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-2", copyId: "copy-2" }),
  );
  const { loanId: loan2 } = (await secondLendResponse.json()) as { loanId: string };
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan2 }, { loanId: loan1 }]);
});
