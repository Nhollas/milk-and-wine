# Borrow a book

A member borrows a copy, is reminded if it's late, and brings it back for the next member.

| Scope |  |
| --- | --- |
| **Owns** | The member's experience across lending, reminding and returning. |
| **Depends on** | [Loans](../../modules/loans/spec.md), [catalogue](../../modules/catalogue/spec.md), [reminders](../../modules/reminders/spec.md). |
| **Excluded** | Finding a book, and reserving a copy that is on loan. |

## Behaviour

### Borrowing and returning

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A copy is available in the catalogue | A member borrows it | They get a loan due 14 days later, and no other member can borrow that copy | system |
| B2 | A member has returned a copy | Another member borrows it | They get a new loan for that copy | system |

### Being reminded

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | A member still has a copy the day after it was due | The daily reminders job runs, twice that day | They are sent exactly one overdue reminder that day | system |

### Renewing

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B4 | A member's loan is not overdue | They renew it | It's due 14 days later than before, and they get no reminder before the new due date | system |

## Limitations

None.

## Open questions

None.
