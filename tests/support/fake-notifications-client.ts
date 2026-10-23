import type {
  NotificationsClient,
  OverdueReminder,
} from "../../src/reminders/notifications-client.ts";

export function fakeNotificationsClient() {
  const sent: OverdueReminder[] = [];
  const refusedLoanIds = new Set<string>();

  const notificationsClient: NotificationsClient = {
    async sendOverdueReminder(reminder) {
      if (refusedLoanIds.has(reminder.loanId))
        return { kind: "refused", reason: `Fake refused loan ${reminder.loanId}` };
      sent.push(reminder);
      return { kind: "accepted" };
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
