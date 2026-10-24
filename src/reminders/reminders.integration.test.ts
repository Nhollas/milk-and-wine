import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { createNotificationsClient } from "./notifications-client.ts";
import { NOTIFICATIONS_PATH, NOTIFY_URL } from "../../tests/support/notifications-api.handlers.ts";
import { httpInterceptor } from "../../tests/support/http-interceptor.ts";

const notificationsClient = createNotificationsClient(NOTIFY_URL);
const reminder = { memberId: "member-1", loanId: "loan-1", dueOn: "2026-03-16" };

test("B5: posts a loan-overdue notification as JSON and accepts a 202", async () => {
  const requests: { method: string; path: string; contentType: string | null; body: unknown }[] =
    [];
  httpInterceptor.use(
    http.post(NOTIFICATIONS_PATH, async ({ request }) => {
      requests.push({
        method: request.method,
        path: new URL(request.url).pathname,
        contentType: request.headers.get("content-type"),
        body: await request.json(),
      });
      return new HttpResponse(null, { status: 202 });
    }),
  );

  const delivery = await notificationsClient.sendOverdueReminder(reminder);

  expect(delivery.kind).toBe("accepted");
  expect(requests).toEqual([
    {
      method: "POST",
      path: "/notifications",
      contentType: "application/json",
      body: {
        memberId: "member-1",
        template: "loan-overdue",
        data: { loanId: "loan-1", dueOn: "2026-03-16" },
      },
    },
  ]);
});

test("B5: accepts a 200", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status: 200 })));

  expect((await notificationsClient.sendOverdueReminder(reminder)).kind).toBe("accepted");
});

test("B5: accepts a 204", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status: 204 })));

  expect((await notificationsClient.sendOverdueReminder(reminder)).kind).toBe("accepted");
});

test("B5: treats any other answer as refused", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status: 400 })));

  expect((await notificationsClient.sendOverdueReminder(reminder)).kind).toBe("refused");
});

test("B5: treats a failed connection as refused", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => HttpResponse.error()));

  expect((await notificationsClient.sendOverdueReminder(reminder)).kind).toBe("refused");
});
