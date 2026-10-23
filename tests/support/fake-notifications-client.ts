import {
  type NotificationsClient,
  NotificationRefused,
  type OverdueReminder,
} from "../../src/reminders/notifications-client.ts";

export function fakeNotificationsClient() {
  const sent: OverdueReminder[] = [];
  const refusedLoanIds = new Set<string>();

  const notificationsClient: NotificationsClient = {
    async sendOverdueReminder(reminder) {
      if (refusedLoanIds.has(reminder.loanId))
        throw new NotificationRefused(`Fake refused loan ${reminder.loanId}`);
      sent.push(reminder);
    },
  };

  return {
    ...notificationsClient,
    sent,
    refuseFor(loanId: string) {
      refusedLoanIds.add(loanId);
    },
  };
}
