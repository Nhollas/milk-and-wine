import type { NotificationsClient, OverdueReminder } from "@milk-and-wine/notifications-client";

export function fakeNotificationsClient() {
  const asked: OverdueReminder[] = [];
  const sent: OverdueReminder[] = [];
  const failures = new Map<string, string>();

  const notificationsClient: NotificationsClient = {
    async sendOverdueReminder(reminder) {
      asked.push(reminder);
      const reason = failures.get(reminder.loanId);
      if (reason !== undefined) return { kind: "failed", reason };
      sent.push(reminder);
      return { kind: "accepted" };
    },
  };

  return {
    ...notificationsClient,
    asked,
    sent,
    failFor(loanId: string, reason: string) {
      failures.set(loanId, reason);
    },
    stopFailing(loanId: string) {
      failures.delete(loanId);
    },
  };
}
