import { expect } from "vitest";
import { postJson } from "../../tests/support/json-requests.ts";
import { test } from "../../tests/support/service.fixtures.ts";

test("B3: records nothing for a failed reminder and doesn't ask again", async ({
  app,
  sendOverdueReminders,
  clock,
  db,
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
  fakeNotifications.failFor(loan1, "Notifications API answered 503");
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(fakeNotifications.asked).toMatchObject([{ loanId: loan1 }, { loanId: loan2 }]);
  expect(db.prepare("SELECT loan_id, sent_on FROM reminders").all()).toEqual([
    { loan_id: loan2, sent_on: "2026-03-17" },
  ]);
});

test("B9: logs a failed reminder", async ({
  app,
  sendOverdueReminders,
  clock,
  logs,
  fakeCatalogue,
  fakeNotifications,
}) => {
  fakeCatalogue.addCopies({ "copy-1": "available" });
  clock.setToday("2026-03-01");
  const lendResponse = await app.request(
    "/loans",
    postJson({ memberId: "member-1", copyId: "copy-1" }),
  );
  const { loanId } = (await lendResponse.json()) as { loanId: string };
  fakeNotifications.failFor(loanId, "Notifications API answered 503");
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(logs).toContainEqual({
    level: "warn",
    event: "reminder.failed",
    fields: { loanId, error: "Notifications API answered 503" },
  });
});

test("B10: carries on with the other loans after a failed reminder", async ({
  app,
  sendOverdueReminders,
  clock,
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
  fakeNotifications.failFor(loan1, "Notifications API answered 503");
  clock.setToday("2026-03-17");

  await sendOverdueReminders();

  expect(fakeNotifications.sent).toMatchObject([{ loanId: loan2 }]);
});
