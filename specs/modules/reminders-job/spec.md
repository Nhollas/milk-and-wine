# Reminders

Reminds members about overdue loans, once a day, through the organisation's Notifications API. A loan is current until its copy is returned.

| Scope |  |
| --- | --- |
| **Owns** | Finding overdue loans, asking for a reminder to be sent, and recording that it was. |
| **Depends on** | Loan records written by [loans](../loans/spec.md); the [Notifications API](../../../docs/external/notifications-api.md), which resolves the member's address and sends the email. |
| **Excluded** | When the job runs. The platform schedules it. |

## Behaviour

### A current loan past its due date is reminded once a day

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A current loan's `dueOn` is before today (UTC), and it has no reminder recorded today | The reminders job runs | Asks the Notifications API to notify the loan's member, then records a reminder for today | unit |
| B8 | A current loan's `dueOn` is today (UTC) or later | The reminders job runs | Sends nothing for that loan | unit |
| B2 | A current loan already has a reminder recorded today | The reminders job runs | Sends nothing for that loan | unit |
| B7 | A loan's copy has been returned | The reminders job runs | Sends nothing for that loan | unit |

### Overdue loans are reminded oldest first

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B6 | Several loans are overdue | The reminders job runs | Asks the Notifications API to notify their members, oldest `dueOn` first | unit |

### A reminder the Notifications API doesn't accept is left for the next day's run

**Why:** A failed reminder stays unrecorded, so the next day's run tries it again.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | The Notifications API doesn't accept a reminder | The job sends a reminder | Records nothing for that loan and doesn't ask again for it in this run | unit |
| B9 | The Notifications API doesn't accept a reminder | The job sends a reminder | Logs `reminder.failed` at `warn` with `loanId` and the failure's `error` | unit |
| B10 | The Notifications API doesn't accept a reminder, and other loans are overdue | The job sends a reminder | Still asks the Notifications API to notify the other loans' members | unit |

### Each run reports what it sent

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B4 | The job has handled every overdue loan | The job finishes | Logs `reminders.finished` at `info` with `accepted` and `failed` counts | unit |

### Only a `2xx` from the Notifications API counts as accepted

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B5 | The job has a reminder to send, and the API answers any `2xx` | The job sends it | Sends `POST {NOTIFY_URL}/notifications` with JSON `{ "memberId", "template": "loan-overdue", "data": { "loanId", "dueOn" } }` and counts it as accepted | integration |
| B11 | The job has a reminder to send, and the API answers anything but a `2xx` | The job sends it | Counts it as failed, with a reason naming the status | integration |
| B12 | The job has a reminder to send, and the connection to the API fails | The job sends it | Counts it as failed, with a reason saying the API was unreachable | integration |

## Limitations

- If the job stops after the Notifications API accepts a reminder but before recording it, the member gets a second reminder the next day.

## Open questions

None.
