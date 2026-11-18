# <Subject>

<One sentence: what it does and for whom.>

| Scope          |                                           |
| -------------- | ----------------------------------------- |
| **Owns**       | <Responsibilities.>                       |
| **Depends on** | <Links to other subjects' specs.>         |
| **Excluded**   | <Plausible scope misunderstandings only.> |

**Terms.** <Only words the scenarios use and the glossary lacks. Leave this out if there are none.>

## Behaviour

### <Rule: one statement of how the subject behaves>

**Why:** <The rule's reason, unless it's obvious. A consequential trade-off gets an ADR instead.>

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | <State already true, with only the values that decide the outcome> | <The one event, and from whom> | <What an observer at the boundary sees> | unit |
| B2 | <The same rule, on the other side of its boundary> | <…> | <…> | unit |

<A scenario that needs a reason of its own, beyond its rule's, gets one after the table: **B2:** <reason>.>

## Limitations

- <Accepted consequence the subject does not recover from.>

## Open questions

<Unsettled behavioural choice: the scenario, the recommended outcome and the decision needed.
Write None when settled.>
