# Workflow

How a change gets from an idea to merged code. It takes three Claude sessions, and each one starts fresh from what the last left in the issue tracker or the repository.

![Three sessions: specify the behaviour, break it into tickets, and deliver each ticket through five agents](assets/workflow/delivery-flow.svg)

## Where things live

Only the wine goes in the repository. Everything about one piece of work lives in the issue tracker and closes when the work is done.

The skills say what to do with an issue or a ticket, and [the issue tracker](agents/issue-tracker/README.md) says how, in the kind `ISSUE_TRACKER` names: **github**, with issues, sub-issues and PRs, or **local**, with markdown files under a gitignored `.issues/` and a branch for each change.

| What | Where | Lasts |
| --- | --- | --- |
| Why the change is happening, and the scenarios it proposes | An issue | Until its last ticket merges |
| The slices of work, what each adds and the order they land in | The slice map: an image in the issue | As long as the issue |
| One slice of the work | A ticket under the issue, with blocking links | Until its change merges |
| What the system does | A behaviour spec under `specs/` | For as long as the system does it |
| A decision that should outlast the change | An ADR under `docs/adr/` | Until it's superseded |

## 1. Specify the behaviour

Run `/specify` with the subject or idea. It grills you a round at a time until the behaviour is settled, then drafts the spec in a shared Claude doc. You comment on the doc and it revises it, until you say it's agreed.

Only then is the spec written to `specs/`, with a `test.todo` for each new scenario. An issue is opened saying why and listing the scenarios it proposes, and the spec change goes up for review. Once you merge it, the new scenarios are proposed: specced, but not built.

## 2. Break it into tickets

Run `/to-tickets` with the issue. It slices the change vertically, so each ticket delivers one or more scenarios end to end and fits in one fresh session.

Before anything is created, it draws a slice map: the system, what each ticket adds to it, and the order they land in. You say what to merge, split or reorder until the map is right. Then it creates each ticket under the issue, with its blocking links, and adds the map to the issue.

It needs `rsvg-convert` to turn the map into a PNG (`brew install librsvg`).

## 3. Deliver each ticket

Run `/foreman` with the issue. It takes each ticket with no open blockers in landing order, gives it a branch, and runs `/deliver` on it. A ticket blocked by an unmerged change waits for you to merge it; run `/foreman` again to carry on.

`/deliver` takes one ticket's subject and scenario IDs, and passes them through five agents, a fresh subagent for each step. You can run it on its own, on a branch you've made.

| Agent | Does | Deliver sends the work back to |
| --- | --- | --- |
| Test writer | Turns the ticket's `test.todo` entries into failing tests |  |
| Intent judge | Checks the tests check what their scenarios say | The test writer, when they don't |
| Implementer | Makes the tests pass, and records how it verified the change |  |
| Mutant writer | Checks the tests fail when the new code is broken | The test writer, when a mutant survives |
| Standards reviewer | Checks the change against [CODING-STANDARDS.md](../CODING-STANDARDS.md) | The implementer or test writer, when it doesn't meet them |

Foreman then puts the ticket up for review, carrying the implementer's evidence and what each check sent back. You review and merge it. Once the last ticket merges, move any decision that should outlast the change into an ADR, and close the issue.

Each agent is a definition that knows only its own input and output: it's given a subject and scenario IDs, and replies once with its result. Deliver is the only part that knows the order, and sends each finding to a fresh agent of the kind that fixes it. An agent becomes a plugin once it has an eval suite, as the intent judge has.

Tickets run one at a time, in the main checkout, because the intent judge's and mutant writer's guards resolve paths against the project directory, not a worktree. Every step is a plain subagent, so delivery also runs headless, with `claude -p`.

## What's built

Everything here exists, but none of it has delivered a change yet.
