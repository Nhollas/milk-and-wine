# Issue tracker

Skills say what to do with an issue or a ticket, and when. A kind of tracker says how. Each kind is one file here, and a skill injects only the active one with `active.sh`.

`ISSUE_TRACKER` picks the kind. [The project settings](../../../.claude/settings.json) set it to `github`. Export it in the shell to override that for one session, as in `ISSUE_TRACKER=local claude`.

| Kind                | Issues and tickets                                 | Review             |
| ------------------- | -------------------------------------------------- | ------------------ |
| [github](github.md) | GitHub issues, with tickets as sub-issues          | A PR               |
| [local](local.md)   | Markdown files under `.issues/`, which git ignores | A branch you merge |

## Adding a kind

A kind's file has one heading per operation, in this order, and a skill names the operation it wants:

- **Open an issue**, from a title and a body.
- **Read an issue**: its body, its comments and its tickets.
- **Add an image to an issue**.
- **Create a ticket** under an issue, with the tickets that block it.
- **Find the ready tickets**: open, not up for review, and every ticket blocking it closed.
- **Branch for a change**, from the latest `main`.
- **Put a change up for review**: a spec change, or a delivered ticket.
- **Close an issue**, once its last ticket has merged.

A ticket closes when its change merges.
