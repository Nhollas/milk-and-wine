# Workflow

How a change gets from an idea to merged code. It takes three Claude sessions, and each one starts fresh from what the last left in the issue tracker or the repository.

## Where things live

Only the wine goes in the repository. Everything about one piece of work lives in the issue tracker and closes when the work is done.

The skills say what to do with an issue or a ticket, and [the issue tracker](../.claude/issue-tracker/README.md) says how, in the kind `ISSUE_TRACKER` names: **github**, with issues, sub-issues and PRs or **local**, with markdown files under a gitignored `.issues/` and a branch for each change.

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

## 3. Build each ticket

Take the tickets in landing order, one whose blockers have all merged at a time. Give it a branch and ask Claude to build it, however it likes. Nothing here says how the code or its tests get written, beyond [CODING-STANDARDS.md](../CODING-STANDARDS.md) and that each scenario's test starts its title with the scenario's ID.

Then run `/review-checks` with the ticket's subject and scenario IDs. It runs two checks, each in a fresh subagent, and fixes the tests until both pass.

| Check | Asks | Kept honest by |
| --- | --- | --- |
| Intent judge | Do the tests check what their scenarios say? | Never reading the code under test |
| Spec mutants | Do the tests fail when the code is broken? | The mutant writer never reading the tests |

It rewords a scenario a check finds behind what was agreed, and stops only for a question whose every answer changes what a scenario means.

Put the change up for review with what `/review-checks` replied: what now works, the spec changes, and what each check sent back. You review and merge it. Once the last ticket merges, close the issue.

Tickets run one at a time, in the main checkout, because the intent judge's and mutant writer's guards resolve paths against the project directory, not a worktree.

An earlier version delivered each ticket through five agents: a test writer, the intent judge, an implementer, the mutant writer and a standards reviewer, with a foreman taking tickets in turn. [Its first playthrough](retros/2026-11-09-first-playthrough.md) cost 22 questions over five tickets, and a plain Claude session given the same kind of spec and tickets built a small feature with its own tests unaided. So the agents that wrote and reviewed code were cut, and the two checks with evidence behind them were kept.

## What's built

`/specify` and `/to-tickets` have been through one playthrough. `/review-checks` hasn't run on a change yet.
