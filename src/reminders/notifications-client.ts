import { endpoint } from "../http.ts";

export class NotificationRefused extends Error {}

export type OverdueReminder = { memberId: string; loanId: string; dueOn: string };

export type NotificationsClient = { sendOverdueReminder(reminder: OverdueReminder): Promise<void> };

export function createNotificationsClient(baseUrl: string): NotificationsClient {
  return {
    async sendOverdueReminder({ memberId, loanId, dueOn }) {
      const response = await fetch(endpoint(baseUrl, "notifications"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, template: "loan-overdue", data: { loanId, dueOn } }),
      });
      if (!response.ok) throw new NotificationRefused(`Notifications API answered ${response.status}`);
    },
  };
}
