# Glossary

The words for the library this service runs, and for the spec-driven process that builds it.

## Library

**Copy**: One physical item the library can lend. The catalogue identifies it by a copy ID unique across branches. _Avoid_: Book, item

**Member**: Someone who borrows copies. Loans identify them by member ID only. _Avoid_: Borrower, user

**Loan**: One member holding one copy, from the day it's lent until the day it's returned. A loan is open until it's returned.

**Due date**: The day a loan should be returned by, set when it's lent ([loans B1](specs/modules/loans/spec.md)).

**Overdue**: An open loan whose due date has passed. _Avoid_: Late

**Withdrawn**: A copy the catalogue says can no longer be lent.

**Reminder**: A notification to a member that a loan is overdue.

**Renewal**: Moving an open loan's due date later. _Avoid_: Extension

## Specs

**Subject**: Anything whose behaviour we promise and can observe at a boundary: a journey, a module, an environment or a tool. Each has one behaviour spec.

**Journey**: A subject that spans modules, told from the member's side. _Avoid_: Flow, user story

**Boundary**: The edge of a subject where an observer sees its behaviour, such as an HTTP API or a deployed URL. Rows describe only what's seen there.

**Behaviour spec**: A subject's spec: the rows it promises now. It lives with the code and is refined over time. _Avoid_: Requirements doc

**Change spec**: A short-lived spec that wraps the rows one piece of work adds, changes or removes. It is deleted when its last row is delivered. _Avoid_: Delivery spec, ticket

**Row**: One promise in a behaviour spec, with an ID, Given, When, Then and Verified. _Avoid_: Acceptance criterion, AC, requirement, scenario

**Level**: The kind of test a row's Verified can name: service, integration, system or smoke. A test file's name carries its level.

**Integration test**: A narrow integration test: our code that talks to a system we don't own, tested against a stand-in for that system. It never reaches the real system or checks that its owners agree. _Avoid_: Contract test, boundary test

**Unit test**: A test in a file with no level. It is welcome but never proves a row.

**Proof**: What a row's Verified says makes it true: a test at its level that names it, a dependency's guarantee, or a runbook step. _Avoid_: Evidence, coverage

**Proposed**: A row whose proof doesn't exist yet. It describes behaviour that isn't built. _Avoid_: Pending, todo

**Delivered**: A row whose proof exists: an active test at its level, or a declared dependency. _Avoid_: Done, implemented

**Sign-off**: A manual row. A person checks it with its runbook; tooling never marks it delivered.
