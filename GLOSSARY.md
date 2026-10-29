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

**Subject**: Anything whose behaviour we promise and can observe at a boundary: a journey, a module or a tool. Each has one behaviour spec.

**Journey**: A subject that spans modules, told from the member's side. _Avoid_: Flow, user story

**Boundary**: The edge of a subject where an observer sees its behaviour, such as an HTTP API or a deployed URL. Rows describe only what's seen there.

**Behaviour spec**: A subject's spec: the rows it promises now. It lives with the code and is refined over time. _Avoid_: Requirements doc

**Change spec**: A short-lived spec that wraps the rows one piece of work adds, changes or removes. It is deleted when its last row is delivered. Described, not practised, in this repository. _Avoid_: Delivery spec, ticket

**Row**: One behaviour in a behaviour spec, with an ID, Given, When, Then and Verified. Its Given, When and Then are its acceptance criteria. _Avoid_: AC, requirement, scenario

**Level**: The kind of test a row's Verified can name: service, integration or system. A test file's name carries its level.

**Integration test**: A narrow integration test: our code that talks to a system we don't own, tested against a stand-in for that system. It never reaches the real system or checks that its owners agree. _Avoid_: Contract test, boundary test

**Unit test**: A test in a file with no level. It is welcome but never proves a row.

**Fake**: A small working implementation of one of our clients, such as `fakeCatalogueClient()`, used in service tests. _Avoid_: Mock, stub

**Handler**: An MSW request handler that stands in for an external API's endpoint, used in integration and system tests. _Avoid_: Mock, fake

**Proof**: What a row's Verified says makes it true: a test at its level that names it, a dependency's guarantee, or a runbook step. _Avoid_: Evidence, coverage

**Proposed**: A row whose proof doesn't exist yet. It describes behaviour that isn't built. _Avoid_: Pending, todo

**Delivered**: A row whose proof exists: an active test at its level, or a declared dependency. _Avoid_: Done, implemented

**Sign-off**: A manual row. A person checks it with its runbook; tooling never marks it delivered.

## Mutants

**Mutant**: A small, deliberate bug in `src/`, kept in a subject's `mutants.json`, that should break one promise of a row's Then. _Avoid_: Seeded bug, fault

**Breaks**: The plain sentence in a mutant's `breaks` saying which promise of its row the bug is meant to break, such as "the reminder isn't recorded".

**Killed**: A mutant whose row's tests fail with it planted. _Avoid_: Caught

**Survived**: A mutant whose row's tests pass with it planted. _Avoid_: Missed

## Intent evals

**Flag**: One thing the intent judge reports: something a row says that its tests don't match, or a test line that checks something the row doesn't say. _Avoid_: Complaint, finding, misalignment

**Judgement**: A person's decision on a flag: right, a false alarm or, in an example, the planted gap in other words. _Avoid_: Verdict, triage

**False alarm**: A flag a person judges wrong, or, in an example, any flag on something other than the planted gap.

**Example**: A small made-up subject, with spec, tests and code, kept for planting cases in. It never changes with the app. _Avoid_: Fixture

**Case**: One gap planted in an example's tests, of one kind, with the difficulty its writer expects: easy, medium or hard. The kinds are:

- **Unchecked**: no test checks something the row says.
- **Wrong thing checked**: a test checks something near it instead.
- **Setup can't show it**: the test's setup can't show whether it holds.
- **Contradicted**: a test expects the opposite of what the row says.
- **Unasked**: a test checks something the row doesn't say.
