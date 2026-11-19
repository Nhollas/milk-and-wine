import { http, HttpResponse } from "msw";

export const NOTIFY_URL = "http://notifications.test";

export const NOTIFICATIONS_PATH = `${NOTIFY_URL}/notifications`;

export type ReceivedNotification = {
  memberId: string;
  template: string;
  data: { loanId: string; dueOn: string };
};

export function sendNotificationHandler(received: ReceivedNotification[]) {
  return http.post(NOTIFICATIONS_PATH, async ({ request }) => {
    received.push((await request.json()) as ReceivedNotification);
    return new HttpResponse(null, { status: 202 });
  });
}
