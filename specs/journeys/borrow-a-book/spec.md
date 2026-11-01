# Borrow a book

A member borrows a copy of a book, is reminded if it's overdue, and brings it back for the next member.

| Scope |  |
| --- | --- |
| **Owns** | The member's experience across lending, reminding, renewing and returning. |
| **Depends on** | [Loans](../../modules/loans/spec.md), [catalogue client](../../modules/catalogue/spec.md), [reminders](../../modules/reminders/spec.md). |
| **Excluded** | Finding a book, and reserving a copy that is on loan. |

## Behaviour

### Borrowing and returning

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A copy is in the catalogue, not withdrawn from lending and not on loan | A member borrows it | The copy is on loan to them, due back 14 days later | system |
| B5 | A member has a copy on loan | Another member tries to borrow it | They are refused | system |
| B2 | A member has returned a copy | Another member borrows it | The copy is on loan to them | system |

### Being reminded

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | A member still has a copy the day after it was due, and that day's reminders have already gone out | Reminders go out again that day | Exactly one reminder to them has been accepted for delivery that day | system |

### Renewing

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B4 | A member's loan is not overdue | They renew it | It's due 14 days later than before | system |
| B6 | A member has renewed a loan | The day's reminders go out before the new due date | They get no reminder for that loan | system |

## Limitations

None.

## Open questions

None.
