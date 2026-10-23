# Renew a loan

| Change |  |
| --- | --- |
| **Jira** | LIB-42 |
| **Rows** | [loans](../../specs/modules/loans/spec.md#renewing-a-loan) B8+ B9+ · [borrow a book](../../specs/journeys/borrow-a-book/spec.md#renewing) B4+ |
| **Status** | `pnpm spec:status loans` and `pnpm spec:status borrow-a-book` |

## Why

Members ask the front desk to extend loans by phone. Letting them renew through the member app removes most of those calls. Two renewals cap how long one member can keep a copy.

## Delivery

| MR | Delivers | Notes |
| --- | --- | --- |
| 1 | Rows above, as proposed, with `test.todo` | Lands the spec so the team can review it before code |
| 2 | loans B8, B9 | Adds `renewals` to the loans table |
| 3 | borrow-a-book B4 | Deletes this folder once the last row is delivered |

## Change-only checks

- [ ] Loans that exist when the `renewals` column is added start at `0`.
- [ ] The member-app team has the `renewal-refused` reasons for their messages.

## Plan

- Renewing changes `dueOn` in place. A loan keeps one row; there is no renewal history.
- Reminders need no change: a renewed loan is no longer overdue, so the sweep skips it.

## Before deleting this folder

- [ ] Decisions with lasting trade-offs → an ADR in `docs/adr/`
- [ ] New domain terms → [GLOSSARY.md](../../GLOSSARY.md)
- [ ] Reasons a row can't explain itself → that row's **Why** note
- [ ] Limitations and unknowns found → the spec's Limitations or Open questions
- [ ] Lessons about the process → the templates
