# Glossary

The few words a person and an agent could otherwise mean different things by. A word earns a place here only if it appears in a spec scenario or in how we talk about the repository, and its plain meaning isn't enough. A name a tool or a test file uses is not a term; it's defined beside the code that uses it.

## Library

**Copy**: One physical item the library can lend, identified by a copy ID unique across branches. It is withdrawn once the catalogue says it can no longer be lent. _Avoid_: Book, item

**Member**: Someone who borrows copies, known to loans by member ID only. _Avoid_: Borrower, user

**Loan**: One member holding one copy, open from the day it's lent until the day it's returned, and overdue while open past its due date. _Avoid_: Late, for overdue

**Reminder**: A notification to a member that a loan is overdue.

## Specs

**Subject**: Anything whose behaviour we promise and can observe from outside: a journey across modules, told from the member's side; a module, at its own edges; or a tool. Each has one spec. _Avoid_: Feature, flow, user story

**Scenario**: One behaviour a spec promises, written as a Given, When and Then with an ID and a Verified. It is proposed until its proof exists, and delivered once that proof does. _Avoid_: Row, AC, requirement; done or todo, for its states

**Verified**: What proves a scenario, named in its last column: a service, integration or system test whose title starts with the scenario's ID and whose file name carries which of the three it is, a dependency's guarantee, or a manual check. _Avoid_: Level, proof, coverage
