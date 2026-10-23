# Spec template

Copy to `specs/<kind>/<subject>/spec.md`, where `<kind>` is `journeys`, `modules`, `environments` or `tools`. A subject is anything whose behaviour we promise and can observe at a boundary, and its folder name must be unique. See [spec-driven development](../SPEC-DRIVEN-DEVELOPMENT.md).

**Rows.** One decidable behaviour per row. IDs are plain (`B1`, B for behaviour), stable, and never reused. **Given** is the state already true, **When** is the one event, **Then** is what an observer at the boundary sees, including after a failure.

**Verified** names what proves the row. A row is proposed until that proof exists ([ADR 0001](../docs/adr/0001-status-is-computed-from-tests.md)).

| Verified | Proven by | Delivered when |
| --- | --- | --- |
| `service` | A test in `<subject>[.<part>].service.test.ts` whose title starts with the ID | The test is active |
| `integration` | The same, in a `.integration.test.ts` file, against a stand-in for a system we don't own | The test is active |
| `system` | The same, in a `.system.test.ts` file | The test is active |
| `smoke` | The same, in a `.smoke.test.ts` file run against a deployed environment | The test is active |
| `dependency <link>` | A guarantee from something we don't own | Declared |
| `manual <link>` | A runbook step | Never; always listed for sign-off |

A row with no test yet gets a `test.todo("B<n>: …")` so the gap is visible in the test file too.

---

# <Subject>

<One sentence: what it does and for whom.>

| Scope          |                                           |
| -------------- | ----------------------------------------- |
| **Owns**       | <Responsibilities.>                       |
| **Depends on** | <Links to other subjects' specs.>         |
| **Excluded**   | <Plausible scope misunderstandings only.> |

## Behaviour

### <Job the subject does>

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | <State already true> | <The one event, and from whom> | <What an observer at the boundary sees> | service |

**Why**

- **B1:** <Only for rows whose reason isn't obvious. A consequential trade-off gets an ADR instead.>

## Limitations

- <Accepted consequence the subject does not recover from.>

## Open questions

<Unsettled behavioural choice: the scenario, the recommended outcome and the decision needed.
Write None when settled.>
