# Remind the members whose loans are overdue

Blocked by: none

## What to build

Running the reminders job asks the Notifications API to remind the member of each overdue current loan, oldest first, and records each reminder so the same loan isn't reminded twice in a day. When every reminder is accepted, the job logs how many it sent.

## Scenarios

- [ ] `reminders B1`: reminds an overdue loan's member and records it
- [ ] `reminders B2`: sends nothing for a loan already reminded today
- [ ] `reminders B7`: sends nothing for a returned loan
- [ ] `reminders B8`: sends nothing for a loan due today or later
- [ ] `reminders B6`: reminds the oldest due date first
- [ ] `reminders B4`: logs the accepted and failed counts when it finishes
- [ ] `reminders B5`: sends the `loan-overdue` request and counts a `2xx` as accepted

## Decisions

- The job runs as `pnpm start:reminders`, which `package.json` already points at `src/reminders/main.ts`. It was weighed against a route on the loans service, which would leave the platform's scheduler needing the service up.
- Reminders are recorded in the same SQLite database as loans. The loans service has already created that database when the job runs, so the job must work on a database whose `loans` table exists as `src/database.ts` creates it today.
