# Reminders

Reminds members about overdue loans, once a day, through the organisation's Notifications API.

| Scope |  |
| --- | --- |
| **Owns** | Finding overdue loans, asking for a reminder to be sent, and recording that it was. |
| **Depends on** | Loan records written by [loans](../loans/spec.md); the [Notifications API](../../../docs/external/notifications-api.md), which resolves the member's address and sends the email. |
| **Excluded** | When the job runs. The platform schedules it. |

## Behaviour

### Sending overdue reminders

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | An open loan's `dueOn` is before today (UTC), and it has no reminder recorded today | The reminders job runs | Asks the Notifications API to notify the loan's member, then records a reminder for today | service |
| B2 | An open loan already has a reminder recorded today, or is returned, or isn't overdue | The reminders job runs | Sends nothing for that loan | service |
| B3 | The Notifications API refuses or can't be reached | The job sends a reminder | Records nothing for that loan, logs `reminder.failed` at `warn` with `loanId` and the refusal's `error`, and carries on with the other loans | service |
| B4 | The job has handled every overdue loan | The job finishes | Logs `reminders.finished` at `info` with `sent` and `failed` counts | service |

### Calling the Notifications API

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B5 | A reminder is due | The job sends it | Sends `POST {NOTIFY_URL}/notifications` with JSON `{ "memberId", "template": "loan-overdue", "data": { "loanId", "dueOn" } }`; any `2xx` counts as accepted, and any other answer or a failed connection as refused, with a reason naming the status or saying the API was unreachable | integration |

**Why**

- **B3:** A failed reminder stays unrecorded, so the next day's run tries it again. We don't retry within a run.

## Limitations

- The reminder is recorded after the Notifications API accepts it. If the job stops between the two, the member gets a second reminder the next day.

## Open questions

None.
