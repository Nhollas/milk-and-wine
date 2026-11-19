export type OverdueReminder = { memberId: string; loanId: string; dueOn: string };

type ReminderDelivery = { kind: "accepted" } | { kind: "failed"; reason: string };

export type NotificationsClient = {
  sendOverdueReminder(reminder: OverdueReminder): Promise<ReminderDelivery>;
};

export function createNotificationsClient(baseUrl: string): NotificationsClient {
  return {
    async sendOverdueReminder({ memberId, loanId, dueOn }) {
      const response = await fetch(`${baseUrl}/notifications`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberId, template: "loan-overdue", data: { loanId, dueOn } }),
      }).catch(() => undefined);
      if (!response) return { kind: "failed", reason: "Notifications API unreachable" };
      if (!response.ok)
        return { kind: "failed", reason: `Notifications API answered ${response.status}` };
      return { kind: "accepted" };
    },
  };
}
