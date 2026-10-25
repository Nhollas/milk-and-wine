import type {
  NotificationsClient,
  OverdueReminder,
} from "../../src/reminders/notifications-client.ts";

export function fakeNotificationsClient() {
  const sent: OverdueReminder[] = [];
  const refusals = new Map<string, string>();

  const notificationsClient: NotificationsClient = {
    async sendOverdueReminder(reminder) {
      const reason = refusals.get(reminder.loanId);
      if (reason !== undefined) return { kind: "refused", reason };
      sent.push(reminder);
      return { kind: "accepted" };
    },
  };

  return {
    ...notificationsClient,
    sent,
    refuseFor(loanId: string, reason: string) {
      refusals.set(loanId, reason);
    },
    stopRefusing(loanId: string) {
      refusals.delete(loanId);
    },
  };
}
