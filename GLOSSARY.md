# Glossary

The few words a person and an agent could otherwise mean different things by. A word earns a place here only if it appears in a spec scenario or in how we talk about the repository, and its plain meaning isn't enough. A name a tool or a test file uses is not a term; it's defined beside the code that uses it.

## Library

**Copy**: One physical book the library can lend, identified by a copy ID unique across library branches. The catalogue can withdraw it from lending. _Avoid_: Item; book, for one copy

**Member**: Someone who borrows copies, known to loans by member ID only. _Avoid_: Borrower, user

**Loan**: The record of one member borrowing one copy. It is current from the day the copy is lent until the day it's returned, and overdue if it's still current past its due date. _Avoid_: Late, for overdue

**Reminder**: A notification to a member that a loan is overdue.

## Specs

**Subject**: Anything with its own spec: a journey, a module or a tool.

**Journey**: Something a member does from start to finish across modules, such as borrowing a book, told from the member's side. _Avoid_: Flow, user story

**Module**: A unit of code with one responsibility, used only through its interface, such as loans or reminders. _Avoid_: Feature

**Scenario**: One acceptance criterion: a starting situation, what happens, and the expected result, written as a Given, When and Then with an ID and a Verified. It is proposed until its proof exists, and delivered once that proof does. _Avoid_: Row, AC; done or todo, for its states

**Requirement**: One thing a scenario's Given or Then says that a test can check, such as a case, boundary or qualifier. _Avoid_: Promise

**Verified**: What proves a scenario, named in its last column: a service, integration or system test whose title starts with the scenario's ID and whose file name carries which of the three it is, a dependency's guarantee, or a manual check. _Avoid_: Level, for this column; coverage
