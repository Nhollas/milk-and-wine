# Loans

Lends copies to members and takes them back, over HTTP, for the library's front-desk and member apps.

| Scope | |
| --- | --- |
| **Owns** | The loans HTTP API, loan records, due dates, and refusing a copy that can't be lent. |
| **Depends on** | [Catalogue](../catalogue/spec.md) to learn whether a copy exists and can be lent. |
| **Excluded** | Members and their eligibility to borrow, fines, and overdue reminders, which [reminders](../reminders/spec.md) sends. |

## Behaviour

### Lending a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B10 | The body is not JSON, or lacks a non-empty `memberId` or `copyId` string | `POST /loans` arrives | Responds `400` with `{ "error": "invalid-request" }` and asks the catalogue nothing | service |
| B1 | The catalogue lists the copy as available, and the copy has no open loan | `POST /loans` arrives with `memberId` and `copyId` | Responds `201` with the loan: `loanId`, `memberId`, `copyId`, `lentOn` (today, UTC) and `dueOn` (14 days later) | service |
| B2 | The copy has an open loan | `POST /loans` arrives for that copy | Responds `409` with `{ "error": "copy-on-loan" }` and creates no loan | service |
| B12 | The copy has no open loan | Two `POST /loans` requests for that copy are processed at once | One responds `201`; the other responds `409` as in B2 | dependency [SQLite partial unique index](https://www.sqlite.org/partialindex.html) |
| B3 | The catalogue lists the copy as withdrawn | `POST /loans` arrives for that copy | Responds `422` with `{ "error": "copy-withdrawn" }` and creates no loan | service |
| B4 | The catalogue does not know the copy | `POST /loans` arrives for that copy | Responds `404` with `{ "error": "copy-not-found" }` and creates no loan | service |
| B5 | The catalogue is unavailable after its client's retries | `POST /loans` arrives | Responds `503` with `{ "error": "catalogue-unavailable" }` and creates no loan | service |

**Why**

- **B5:** We refuse rather than lend unchecked. A withdrawn copy lent out can't be found again.
- **B12:** The database refuses a second open loan for a copy, so this holds across processes too.

### Returning a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B6 | The loan is open | `POST /loans/{loanId}/return` arrives | Responds `200` with the loan and `returnedOn` (today, UTC); the copy can be lent again | service |
| B7 | No loan has that ID, or it was already returned | `POST /loans/{loanId}/return` arrives | Responds `404` with `{ "error": "loan-not-found" }` or `409` with `{ "error": "already-returned" }` and changes nothing | service |

### Renewing a loan

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B8 | The loan is open, not overdue, and renewed fewer than 2 times | `POST /loans/{loanId}/renew` arrives | Responds `200` with `dueOn` moved 14 days past the current due date | service |
| B9 | The loan is overdue, or already renewed twice | `POST /loans/{loanId}/renew` arrives | Responds `409` with `{ "error": "renewal-refused", "reason": "overdue" }` or `"renewal-limit"` and changes nothing | service |

### Operating

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B11 | The service is running | `GET /health` arrives | Responds `200` with `{ "status": "ok" }` without touching the catalogue or the database | service |

## Limitations

- A loan's `dueOn` ignores library closing days.

## Open questions

None.
