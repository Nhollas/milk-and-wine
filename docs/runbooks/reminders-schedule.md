# Checking the reminders schedule

Proves [production B3](../../specs/environments/production/spec.md#reminding-members). Repeat it
after any change to the reminders job's schedule or storage, and when the platform changes how
scheduled jobs run.

1. Find yesterday's `reminders.swept` log line in the log backend. There should be exactly one,
   between 09:00 and 09:10 UTC.
2. Check its `sent` count against the loans that were overdue yesterday morning, from the
   service's database.
3. Record the date and your name in the release notes of the change that asked for the check.
