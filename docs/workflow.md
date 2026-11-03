# Workflow

How a change gets from an idea to merged code. It takes three Claude sessions, and each one starts fresh from what the last left on GitHub or in the repository.

![Three sessions: specify the behaviour, break it into tickets, and deliver each ticket through five teammates](assets/workflow/delivery-flow.svg)

## Where things live

Only the wine goes in the repository. Everything about one piece of work lives on GitHub and closes when the work is done.

| What | Where | Lasts |
| --- | --- | --- |
| Why the change is happening, and the scenario IDs it proposes | The change spec: a parent issue | Until its last ticket merges |
| The slices of work, what each adds and the order they land in | The slice map: an image on the parent issue | As long as the parent issue |
| One slice of the work | A ticket: a sub-issue of the parent, with blocking links | Until its PR merges |
| What the system does | A behaviour spec under `specs/` | For as long as the system does it |
| A decision that should outlast the change | An ADR under `docs/adr/` | Until it's superseded |

## 1. Specify the behaviour

Run `/write-spec` with the subject or idea. It uses `/grill` to question you until the behaviour is settled, then drafts the spec in a shared Claude doc. You comment on the doc and it revises it, until you say it's agreed.

Only then is the spec written to `specs/`, with a `test.todo` for each new scenario. The spec change goes up as a PR, and the change spec is opened as a parent issue that links the PR and the scenario IDs. Once you merge the PR, the new scenarios are proposed: specced, but not built.

## 2. Break it into tickets

Run `/to-tickets` with the parent issue. It slices the change vertically, so each ticket delivers one or more scenarios end to end and fits in one fresh session.

Before anything is created, it draws a slice map: the system, what each ticket adds to it, and the order they land in. You say what to merge, split or reorder until the map is right. Then it creates each ticket as a sub-issue of the parent, with native blocking links, and attaches the map to the parent issue.

It needs GitHub CLI 2.94 or later, for `--parent`, `--blocked-by` and `--attach`, and `rsvg-convert` to turn the map into a PNG (`brew install librsvg`).

## 3. Deliver each ticket

Run `/foreman` with the parent issue. Foreman leads an agent team. It takes every ticket with no open blockers, gives each its own worktree and branch, and passes it through five teammates, starting a fresh one for each step.

| Teammate | Does | Sends the work back to |
| --- | --- | --- |
| Test writer | Turns the ticket's `test.todo` entries into failing tests |  |
| Intent judge | Checks the tests check what their scenarios say | The test writer, when they don't |
| Implementer | Makes the tests pass, and records how it verified the change |  |
| Mutant writer | Checks the tests fail when the new code is broken | The test writer, when a mutant survives |
| Standards reviewer | Checks the code against [CODING-STANDARDS.md](../CODING-STANDARDS.md) | The implementer, when it doesn't meet them |

The ticket then goes up as a PR that closes its sub-issue and carries the implementer's evidence. You review and merge it. The parent issue closes with its last ticket, once any decision that should outlast it is in an ADR.

Each teammate is an agent definition, so its tools, model and instructions are fixed rather than handed over when it starts. A teammate becomes a plugin once it has an eval suite, as the intent judge has.

## What's built

`/grill`, `/write-spec`, `/to-tickets` and all five teammates exist. `/foreman` is still to come.
