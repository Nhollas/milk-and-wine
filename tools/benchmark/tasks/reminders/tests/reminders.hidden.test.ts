import { expect } from "vitest";
import { test, utcDate } from "./reminders-job.fixtures.ts";

test("B1: asks the Notifications API to notify the member of an overdue current loan", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });

  await job.run();

  expect(notificationsApi.notifiedMembers).toEqual(["member-1"]);
});

test("B2: sends nothing for a loan already reminded today", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });
  await job.run();

  await job.run();

  expect(notificationsApi.notifiedMembers).toEqual(["member-1"]);
});

test("B7: sends nothing for a loan whose copy has been returned", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({
    loanId: "loan-1",
    memberId: "member-1",
    dueOn: utcDate(-3),
    returnedOn: utcDate(-1),
  });

  await job.run();

  expect(notificationsApi.received).toEqual([]);
});

test("B8: sends nothing for a loan due today or later", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(0) });
  loans.add({ loanId: "loan-2", memberId: "member-2", dueOn: utcDate(1) });

  await job.run();

  expect(notificationsApi.received).toEqual([]);
});

test("B3: records nothing for a refused reminder, and doesn't ask again in the same run", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });
  notificationsApi.answers(503);

  await job.run();

  expect(notificationsApi.notifiedMembers).toEqual(["member-1"]);
  notificationsApi.answers(202);
  await job.run();
  expect(notificationsApi.notifiedMembers).toEqual(["member-1", "member-1"]);
});

test("B9: logs reminder.failed at warn with the loan and the error", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });
  notificationsApi.answers(503);

  const logs = await job.run();

  expect(logs).toContainEqual(
    expect.objectContaining({
      level: "warn",
      event: "reminder.failed",
      loanId: "loan-1",
      error: expect.any(String),
    }),
  );
});

test("B10: still notifies the other members when one reminder is refused", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-3) });
  loans.add({ loanId: "loan-2", memberId: "member-2", dueOn: utcDate(-2) });
  loans.add({ loanId: "loan-3", memberId: "member-3", dueOn: utcDate(-1) });
  notificationsApi.answersFor("member-1", 503);

  await job.run();

  expect(notificationsApi.notifiedMembers).toEqual(["member-1", "member-2", "member-3"]);
});

test("B6: notifies members oldest due date first", async ({ loans, job, notificationsApi }) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-2) });
  loans.add({ loanId: "loan-2", memberId: "member-2", dueOn: utcDate(-5) });
  loans.add({ loanId: "loan-3", memberId: "member-3", dueOn: utcDate(-1) });

  await job.run();

  expect(notificationsApi.notifiedMembers).toEqual(["member-2", "member-1", "member-3"]);
});

test("B4: logs reminders.finished at info with the accepted and failed counts", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-3) });
  loans.add({ loanId: "loan-2", memberId: "member-2", dueOn: utcDate(-2) });
  loans.add({ loanId: "loan-3", memberId: "member-3", dueOn: utcDate(-1) });
  notificationsApi.answersFor("member-2", 503);

  const logs = await job.run();

  expect(logs).toContainEqual(
    expect.objectContaining({ level: "info", event: "reminders.finished", accepted: 2, failed: 1 }),
  );
});

test("B5: sends the loan-overdue notification and counts a 2xx as accepted", async ({
  loans,
  job,
  notificationsApi,
}) => {
  const dueOn = utcDate(-1);
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn });
  notificationsApi.answers(204);

  const logs = await job.run();

  expect(notificationsApi.received).toEqual([
    {
      method: "POST",
      path: "/notifications",
      body: { memberId: "member-1", template: "loan-overdue", data: { loanId: "loan-1", dueOn } },
    },
  ]);
  expect(logs).toContainEqual(
    expect.objectContaining({ event: "reminders.finished", accepted: 1, failed: 0 }),
  );
});

test("B11: counts a non-2xx answer as failed, with a reason naming the status", async ({
  loans,
  job,
  notificationsApi,
}) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });
  notificationsApi.answers(418);

  const logs = await job.run();

  expect(logs).toContainEqual(
    expect.objectContaining({ event: "reminder.failed", error: expect.stringContaining("418") }),
  );
  expect(logs).toContainEqual(
    expect.objectContaining({ event: "reminders.finished", accepted: 0, failed: 1 }),
  );
});

test("B12: counts a failed connection as failed", async ({ loans, job }) => {
  loans.add({ loanId: "loan-1", memberId: "member-1", dueOn: utcDate(-1) });

  const logs = await job.run({ notifyUrl: "http://127.0.0.1:1" });

  expect(logs).toContainEqual(
    expect.objectContaining({ event: "reminder.failed", error: expect.any(String) }),
  );
  expect(logs).toContainEqual(
    expect.objectContaining({ event: "reminders.finished", accepted: 0, failed: 1 }),
  );
});
