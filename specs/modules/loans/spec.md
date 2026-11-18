# Loans

Lends copies of books to members and takes them back, over HTTP, for the library's front-desk and member apps. A loan is current until its copy is returned.

| Scope |  |
| --- | --- |
| **Owns** | The loans HTTP API, loan records, due dates, and refusing a copy that can't be lent. |
| **Depends on** | [Catalogue client](../catalogue/spec.md) to learn whether a copy exists and can be lent. |
| **Excluded** | Members and their eligibility to borrow, fines, and reminders, which [reminders](../reminders/spec.md) sends. |

## Behaviour

### A request must name a member and a copy

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B10 | The body is not JSON | `POST /loans` arrives | Responds `400` with `{ "error": "invalid-request" }` and asks the catalogue nothing | unit |
| B16 | The body has no `memberId`, or its `memberId` is `""` | `POST /loans` arrives | Responds `400` with `{ "error": "invalid-request" }` and asks the catalogue nothing | unit |
| B17 | The body's `copyId` is `""` | `POST /loans` arrives | Responds `400` with `{ "error": "invalid-request" }` and asks the catalogue nothing | unit |

### A copy the catalogue lists as lendable is lent for 14 days

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | The catalogue lists the copy as not withdrawn from lending, and the copy has no current loan | `POST /loans` arrives with `memberId` and `copyId` | Responds `201` with the loan: `loanId`, `memberId`, `copyId`, `lentOn` (today, UTC) and `dueOn` (14 days later) | unit |

### A copy has at most one current loan

**Why:** A copy is one physical book, so only one member can hold it.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B2 | The copy has a current loan | `POST /loans` arrives for that copy | Responds `409` with `{ "error": "copy-on-loan" }`, creates no loan and asks the catalogue nothing | unit |
| B12 | The copy has no current loan | Two `POST /loans` requests for that copy are processed at once, by one process or by separate ones | Only one loan is stored for that copy | dependency [SQLite partial unique index](https://www.sqlite.org/partialindex.html) |
| B15 | The copy has no current loan | Two `POST /loans` requests for that copy are processed at once | One responds `201`; the other responds `409` with `{ "error": "copy-on-loan" }` and creates no loan | unit |

- **B2:** A copy on loan can be refused from our own records, so a catalogue outage or a withdrawal doesn't change the answer.
- **B15:** A member told they have a copy must have a loan behind it, so the request that loses is refused.

### A copy the catalogue can't confirm is lendable isn't lent

**Why:** We refuse rather than lend unchecked, because the copy might have been withdrawn from lending.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | The catalogue lists the copy as withdrawn | `POST /loans` arrives for that copy | Responds `422` with `{ "error": "copy-withdrawn" }` and creates no loan | unit |
| B4 | The catalogue does not know the copy | `POST /loans` arrives for that copy | Responds `404` with `{ "error": "copy-not-found" }` and creates no loan | unit |
| B5 | The catalogue is still unavailable after retries | `POST /loans` arrives | Responds `503` with `{ "error": "catalogue-unavailable" }` and creates no loan | unit |

### A current loan can be returned once

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B6 | The loan is current | `POST /loans/{loanId}/return` arrives | Responds `200` with the loan and `returnedOn` (today, UTC); the copy can be lent again | unit |
| B7 | No loan has that ID | `POST /loans/{loanId}/return` arrives | Responds `404` with `{ "error": "loan-not-found" }` and changes nothing | unit |
| B13 | The loan's copy was already returned | `POST /loans/{loanId}/return` arrives | Responds `409` with `{ "error": "already-returned" }` and changes nothing | unit |

### A loan can be renewed twice, unless it's overdue

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B8 | The loan is current, due 1 Dec, renewed 0 times, and today is 20 Nov | `POST /loans/{loanId}/renew` arrives | Responds `200` with `dueOn` 14 days later than before | unit |
| B18 | The loan is current, due 1 Dec, renewed once, and today is 20 Nov | `POST /loans/{loanId}/renew` arrives | Responds `200` with `dueOn` 14 days later than before | unit |
| B19 | The loan is current, due 20 Nov, renewed 0 times, and today is 20 Nov | `POST /loans/{loanId}/renew` arrives | Responds `200` with `dueOn` 14 days later than before | unit |
| B9 | The loan is current, due 19 Nov, and today is 20 Nov | `POST /loans/{loanId}/renew` arrives | Responds `409` with `{ "error": "renewal-refused", "reason": "overdue" }` and changes nothing | unit |
| B14 | The loan is current, due 1 Dec, renewed twice, and today is 20 Nov | `POST /loans/{loanId}/renew` arrives | Responds `409` with `{ "error": "renewal-refused", "reason": "renewal-limit" }` and changes nothing | unit |

- **B19:** A loan is overdue only once it's past its due date, so it can still be renewed on the day it's due.

### The app reports its health without its dependencies

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B11 | The app is running | `GET /health` arrives | Responds `200` with `{ "status": "ok" }` without touching the catalogue or the database | unit |

## Limitations

- A loan's `dueOn` ignores library closing days.

## Open questions

None.
