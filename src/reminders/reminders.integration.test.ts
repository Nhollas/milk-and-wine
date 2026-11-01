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

test.each([200, 201, 204, 299])("B5: accepts a %i", async (status) => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status })));

  expect((await notificationsClient.sendOverdueReminder(reminder)).kind).toBe("accepted");
});

test.each([
  { status: 304, reason: "304" },
  { status: 400, reason: "400" },
  { status: 503, reason: "503" },
])("B11: treats a $status as failed", async ({ status, reason }) => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status })));

  expect(await notificationsClient.sendOverdueReminder(reminder)).toEqual({
    kind: "failed",
    reason: expect.stringContaining(reason),
  });
});

test("B5: keeps the path NOTIFY_URL has", async () => {
  const notifyUrlWithPath = "http://notifications.test/api";
  const paths: string[] = [];
  httpInterceptor.use(
    http.post(`${notifyUrlWithPath}/notifications`, ({ request }) => {
      paths.push(new URL(request.url).pathname);
      return new HttpResponse(null, { status: 202 });
    }),
  );

  const delivery = await createNotificationsClient(notifyUrlWithPath).sendOverdueReminder(reminder);

  expect(delivery.kind).toBe("accepted");
  expect(paths).toEqual(["/api/notifications"]);
});

test("B12: treats an unreachable API as failed", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => HttpResponse.error()));

  expect(await notificationsClient.sendOverdueReminder(reminder)).toEqual({
    kind: "failed",
    reason: expect.stringContaining("unreachable"),
  });
});
