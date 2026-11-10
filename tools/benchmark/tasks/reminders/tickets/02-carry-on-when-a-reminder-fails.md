# Carry on when the Notifications API fails a reminder

Blocked by: 01

## What to build

When the Notifications API refuses a reminder or can't be reached, the job logs the failure, leaves that loan unrecorded so tomorrow's run tries it again, and still reminds the other overdue loans. Its finishing log counts the failures.

## Scenarios

- [ ] `reminders B3`: records nothing for a failed reminder and doesn't retry it in this run
- [ ] `reminders B9`: logs `reminder.failed` with the loan and the error
- [ ] `reminders B10`: still reminds the other overdue loans
- [ ] `reminders B11`: counts a non-`2xx` answer as failed, naming the status
- [ ] `reminders B12`: counts a failed connection as failed, saying the API was unreachable

## Decisions

None.
