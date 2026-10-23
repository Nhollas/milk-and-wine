# Context

## Library

| Term | Meaning |
| --- | --- |
| **Copy** | One physical item the library can lend. The catalogue identifies it by a copy ID unique across branches. |
| **Member** | Someone who borrows copies. Loans identify them by member ID only. |
| **Loan** | One member holding one copy, from the day it's lent until the day it's returned. A loan is open until it's returned. |
| **Due date** | The day a loan should be returned by: 14 days after it was lent. |
| **Overdue** | An open loan whose due date has passed. |
| **Withdrawn** | A copy the catalogue says can no longer be lent. |
| **Reminder** | A notification to a member that a loan is overdue. At most one per loan per day. |
| **Renewal** | Moving an open loan's due date 14 days later, at most twice. Proposed in [LIB-42](changes/renew-a-loan/spec.md). |

## Specs

| Term | Meaning |
| --- | --- |
| **Subject** | Anything with a boundary we make promises at: a journey, a module, an environment or a tool. Each has one spec. |
| **Journey** | A subject that spans modules, told from the member's side. |
| **Row** | One promise in a spec, with an ID, Given, When, Then and Verified. |
| **Proposed** | A row whose proof doesn't exist yet. It describes behaviour that isn't built. |
| **Delivered** | A row whose proof exists: an active test at its Verified level, or a declared dependency. |
| **Sign-off** | A manual row. A person checks it with its runbook; tooling never marks it delivered. |
| **Change** | A short-lived spec that wraps the rows one piece of work adds, changes or removes. Deleted when its last row is delivered. |
