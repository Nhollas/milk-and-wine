# Glossary

The few words a person and an agent could otherwise mean different things by. A word earns a place here only if it appears in a spec row or in how we talk about the repository, and its plain meaning isn't enough. A name a tool or a test file uses is not a term; it's defined beside the code that uses it.

## Library

**Copy**: One physical item the library can lend, identified by a copy ID unique across branches. It is withdrawn once the catalogue says it can no longer be lent. _Avoid_: Book, item

**Member**: Someone who borrows copies, known to loans by member ID only. _Avoid_: Borrower, user

**Loan**: One member holding one copy, open from the day it's lent until the day it's returned, and overdue while open past its due date. _Avoid_: Late, for overdue

**Reminder**: A notification to a member that a loan is overdue.

## Specs

**Subject**: Anything whose behaviour we promise and can observe from outside: a journey across modules, told from the member's side; a module, at its own edges; or a tool. Each has one spec. _Avoid_: Feature, flow, user story

**Row**: One behaviour a spec promises, with an ID, Given, When, Then and Verified. It is proposed until its proof exists, and delivered once an active test at its level names it or a dependency is declared. _Avoid_: AC, requirement, scenario; done or todo, for its states

**Level**: Where a row is proven, named by its Verified and carried in a test file's name: service, integration or system. A test with no level never proves a row.
