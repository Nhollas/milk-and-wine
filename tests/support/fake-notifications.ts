import { http, HttpResponse } from "msw";
import { network } from "./network.ts";

export const NOTIFY_URL = "http://notifications.test";

export type ReceivedNotification = {
  memberId: string;
  template: string;
  data: { loanId: string; dueOn: string };
};

export function fakeNotifications({ refuseFor = [] as string[], status = 202 } = {}) {
  const received: ReceivedNotification[] = [];
  network.use(
    http.post(`${NOTIFY_URL}/notifications`, async ({ request }) => {
      const notification = (await request.json()) as ReceivedNotification;
      if (refuseFor.includes(notification.data.loanId)) return new HttpResponse(null, { status: 503 });
      received.push(notification);
      return new HttpResponse(null, { status });
    }),
  );
  return { received };
}
