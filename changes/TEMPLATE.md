# Change template

Copy to `changes/<change>/spec.md`. A change spec wraps the rows a piece of work adds, changes or removes, then is deleted in the MR that delivers its last row. It never owns a requirement: rows live in `specs/`. See [spec-driven development](../SPEC-DRIVEN-DEVELOPMENT.md).

Mark rows `+` added, `~` changed or `−` removed.

---

# <Change name>

| Change     |                                   |
| ---------- | --------------------------------- |
| **Jira**   | <KEY-123>                         |
| **Rows**   | <subject> B4+ B2~ · <subject> B7− |
| **Status** | `pnpm spec:status <subject>`      |

## Why

<The problem and the outcome, in a few sentences.>

## Delivery

| MR  | Delivers            | Notes                                   |
| --- | ------------------- | --------------------------------------- |
| 1   | <Rows, as proposed> | <Lands the spec for review before code> |

## Change-only checks

- [ ] <Something that must be true once, such as a data backfill, and needs no row.>

## Plan

- <Design notes for whoever implements it.>

## Before deleting this folder

- [ ] Decisions with lasting trade-offs → an ADR in `docs/adr/`
- [ ] New domain terms → `GLOSSARY.md`
- [ ] Reasons a row can't explain itself → that row's **Why** note
- [ ] Limitations and unknowns found → the spec's Limitations or Open questions
- [ ] Lessons about the process → the templates
