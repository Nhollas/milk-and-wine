import { http, HttpResponse } from "msw";
import { expect, test } from "vitest";
import { createNotificationsClient, NotificationRefused } from "./notifications-client.ts";
import { NOTIFICATIONS_PATH, NOTIFY_URL } from "../../tests/support/notifications-api.handlers.ts";
import { httpInterceptor } from "../../tests/support/http-interceptor.ts";

const notificationsClient = createNotificationsClient(NOTIFY_URL);
const reminder = { memberId: "member-1", loanId: "loan-1", dueOn: "2026-03-16" };

test("B5: posts a loan-overdue notification and accepts any 2xx answer", async () => {
  const requests: { method: string; path: string; contentType: string | null; body: unknown }[] =
    [];
  const statuses = [200, 202, 204];
  httpInterceptor.use(
    http.post(NOTIFICATIONS_PATH, async ({ request }) => {
      requests.push({
        method: request.method,
        path: new URL(request.url).pathname,
        contentType: request.headers.get("content-type"),
        body: await request.json(),
      });
      return new HttpResponse(null, { status: statuses[requests.length - 1] ?? 500 });
    }),
  );

  for (const _ of statuses) await notificationsClient.sendOverdueReminder(reminder);

  expect(requests).toHaveLength(3);
  expect(requests[0]).toEqual({
    method: "POST",
    path: "/notifications",
    contentType: "application/json",
    body: {
      memberId: "member-1",
      template: "loan-overdue",
      data: { loanId: "loan-1", dueOn: "2026-03-16" },
    },
  });
});

test("B5: treats any other answer as refused", async () => {
  httpInterceptor.use(http.post(NOTIFICATIONS_PATH, () => new HttpResponse(null, { status: 400 })));

  await expect(notificationsClient.sendOverdueReminder(reminder)).rejects.toThrow(
    NotificationRefused,
  );
});
