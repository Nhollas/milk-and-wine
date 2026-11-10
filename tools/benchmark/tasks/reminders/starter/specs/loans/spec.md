# Loans

Lends copies of books to members and takes them back, over HTTP, for the library's front-desk and member apps. A loan is current until its copy is returned.

| Scope |  |
| --- | --- |
| **Owns** | The loans HTTP API, loan records, due dates, and refusing a copy that can't be lent. |
| **Depends on** | [Catalogue client](../catalogue/spec.md) to learn whether a copy exists and can be lent. |
| **Excluded** | Members and their eligibility to borrow, fines, and reminders, which [reminders](../reminders/spec.md) sends. |

## Behaviour

### Lending a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B10 | The body is not JSON, or lacks a non-empty `memberId` or `copyId` string | `POST /loans` arrives | Responds `400` with `{ "error": "invalid-request" }` and asks the catalogue nothing | service |
| B1 | The catalogue lists the copy as not withdrawn from lending, and the copy has no current loan | `POST /loans` arrives with `memberId` and `copyId` | Responds `201` with the loan: `loanId`, `memberId`, `copyId`, `lentOn` (today, UTC) and `dueOn` (14 days later) | service |
| B2 | The copy has a current loan | `POST /loans` arrives for that copy | Responds `409` with `{ "error": "copy-on-loan" }`, creates no loan and asks the catalogue nothing | service |
| B12 | The copy has no current loan | Two `POST /loans` requests for that copy are processed at once, by one process or by separate ones | Only one loan is stored for that copy | dependency [SQLite partial unique index](https://www.sqlite.org/partialindex.html) |
| B15 | The copy has no current loan | Two `POST /loans` requests for that copy are processed at once | One responds `201`; the other responds `409` with `{ "error": "copy-on-loan" }` and creates no loan | service |
| B3 | The catalogue lists the copy as withdrawn | `POST /loans` arrives for that copy | Responds `422` with `{ "error": "copy-withdrawn" }` and creates no loan | service |
| B4 | The catalogue does not know the copy | `POST /loans` arrives for that copy | Responds `404` with `{ "error": "copy-not-found" }` and creates no loan | service |
| B5 | The catalogue is still unavailable after retries | `POST /loans` arrives | Responds `503` with `{ "error": "catalogue-unavailable" }` and creates no loan | service |

**Why**

- **B2:** A copy on loan can be refused from our own records, so a catalogue outage or a withdrawal doesn't change the answer.
- **B5:** We refuse rather than lend unchecked, because the copy might have been withdrawn from lending.
- **B12:** A copy is one physical book, so only one member can hold it.
- **B15:** A member told they have a copy must have a loan behind it, so the request that loses is refused.

### Returning a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B6 | The loan is current | `POST /loans/{loanId}/return` arrives | Responds `200` with the loan and `returnedOn` (today, UTC); the copy can be lent again | service |
| B7 | No loan has that ID | `POST /loans/{loanId}/return` arrives | Responds `404` with `{ "error": "loan-not-found" }` and changes nothing | service |
| B13 | The loan's copy was already returned | `POST /loans/{loanId}/return` arrives | Responds `409` with `{ "error": "already-returned" }` and changes nothing | service |

### Renewing a loan

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B8 | The loan is current and not overdue, and has been renewed fewer than 2 times | `POST /loans/{loanId}/renew` arrives | Responds `200` with `dueOn` 14 days later than before | service |
| B9 | The loan is overdue | `POST /loans/{loanId}/renew` arrives | Responds `409` with `{ "error": "renewal-refused", "reason": "overdue" }` and changes nothing | service |
| B14 | The loan was already renewed twice | `POST /loans/{loanId}/renew` arrives | Responds `409` with `{ "error": "renewal-refused", "reason": "renewal-limit" }` and changes nothing | service |

### Operating

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B11 | The app is running | `GET /health` arrives | Responds `200` with `{ "status": "ok" }` without touching the catalogue or the database | service |

## Limitations

- A loan's `dueOn` ignores library closing days.

## Open questions

None.
