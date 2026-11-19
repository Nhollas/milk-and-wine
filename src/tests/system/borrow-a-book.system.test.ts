import { expect } from "vitest";
import { copyLookupHandler } from "../support/catalogue-api.handlers.ts";
import { httpInterceptor } from "../support/http-interceptor.ts";
import { postJson } from "../support/json-requests.ts";
import {
  type ReceivedNotification,
  sendNotificationHandler,
} from "../support/notifications-api.handlers.ts";
import { test } from "./system.fixtures.ts";

test("B1: a member borrows an available copy, due in 14 days", async ({ app, clock, db }) => {
  httpInterceptor.use(copyLookupHandler({ "copy-1": "available" }));
  clock.setToday("2026-03-02");

  const lendResponse = await app.request("/loans", postJson({ memberId: "ada", copyId: "copy-1" }));

  expect(lendResponse.status).toBe(201);
  expect(await lendResponse.json()).toMatchObject({ dueOn: "2026-03-16" });
  expect(db.prepare("SELECT member_id, copy_id, returned_on FROM loans").all()).toEqual([
    { member_id: "ada", copy_id: "copy-1", returned_on: null },
  ]);
});

test("B5: no one else can borrow a copy that is on loan", async ({ app }) => {
  httpInterceptor.use(copyLookupHandler({ "copy-1": "available" }));
  await app.request("/loans", postJson({ memberId: "ada", copyId: "copy-1" }));

  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "grace", copyId: "copy-1" }),
  );

  expect(secondLendResponse.status).toBe(409);
});

test("B2: once a member returns a copy, another member can borrow it", async ({ app, clock }) => {
  httpInterceptor.use(copyLookupHandler({ "copy-1": "available" }));
  clock.setToday("2026-03-02");
  const lendResponse = await app.request("/loans", postJson({ memberId: "ada", copyId: "copy-1" }));
  const { loanId } = (await lendResponse.json()) as { loanId: string };

  await app.request(`/loans/${loanId}/return`, postJson());
  const secondLendResponse = await app.request(
    "/loans",
    postJson({ memberId: "grace", copyId: "copy-1" }),
  );

  expect(secondLendResponse.status).toBe(201);
  expect(await secondLendResponse.json()).toMatchObject({ memberId: "grace" });
});

test("B3: a member who keeps a copy past its due date gets one reminder that day", async ({
  app,
  sendOverdueReminders,
  clock,
}) => {
  const notifications: ReceivedNotification[] = [];
  httpInterceptor.use(
    copyLookupHandler({ "copy-1": "available" }),
    sendNotificationHandler(notifications),
  );
  clock.setToday("2026-03-02");
  await app.request("/loans", postJson({ memberId: "ada", copyId: "copy-1" }));

  clock.setToday("2026-03-16");
  await sendOverdueReminders();
  clock.setToday("2026-03-17");
  await sendOverdueReminders();
  await sendOverdueReminders();

  expect(notifications).toEqual([
    {
      memberId: "ada",
      template: "loan-overdue",
      data: { loanId: expect.any(String), dueOn: "2026-03-16" },
    },
  ]);
});

test.todo("B4: a renewed loan is due 14 days later");

test.todo("B6: a renewed loan gets no reminder before its new due date");
