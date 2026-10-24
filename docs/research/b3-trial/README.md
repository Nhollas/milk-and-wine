# Reminders B3 trial

A trial of recommendation 3 in [ai-test-faithfulness.md](../ai-test-faithfulness.md): plant one bug per promise in a row's Then, and require the row's test to fail on each.

[Reminders B3](../../../specs/modules/reminders/spec.md) promises that, when the Notifications API refuses, the job records nothing for that loan, logs `reminder.failed` at `warn` with `loanId` and `error`, and carries on with the other loans. Each patch here breaks one of those promises in `src/reminders/send-overdue-reminders.ts`. They were written from the row and the code, before reading B3's test.

Run `docs/research/b3-trial/run.sh`. It applies each patch, runs only B3's test, and reverts.

## Results

| Patch                        | Promise it breaks               | B3's test | B3's test, weakened |
| ---------------------------- | ------------------------------- | --------- | ------------------- |
| 1-records-a-refused-reminder | records nothing for that loan   | caught    | caught              |
| 2-wrong-event                | logs `reminder.failed`          | caught    | caught              |
| 3-logs-at-info               | at `warn`                       | caught    | caught              |
| 4-drops-loan-id              | with `loanId`                   | caught    | **missed**          |
| 5-drops-error                | and `error`                     | caught    | **missed**          |
| 6-stops-after-a-refusal      | carries on with the other loans | caught    | caught              |

The weakened test is [control/weaker-b3-test.patch](control/weaker-b3-test.patch): it checks only the log's level and event. It still passes, and so does `pnpm check`.

Stryker also flags this weakening, as a surviving `{}` mutant on the log's fields, but only because no other test checks those fields, and its report names a line, not the promise. Neither approach finds a promise that the code and the test both leave out.

## Rerun with independent bugs

A fresh agent, shown only the row and `send-overdue-reminders.ts`, wrote the patches in [independent/](independent/). It split the Then into the same six promises and wrote near-identical bugs. Run them with `docs/research/b3-trial/run.sh docs/research/b3-trial/independent`.

They got the same results as patches 1 to 5, but the rerun exposed a flaky result. B3's test catches "stops after a refusal" only some of the time: 12 of 20 runs. Both overdue loans are due on the same day, so `remindersDue` orders them by `loan_id`, a random UUID. When the refused loan happens to come last, `break` behaves like `continue` and the test passes. So B3's test proves "carries on with the other loans" only about half the time.

Stryker never mutates the `continue`, so its report can't show this gap. Fixing it changes what a `B3:` test checks, so it is left for a person to decide.
