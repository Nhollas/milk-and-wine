---
paths:
  - "specs/**/spec.md"
---

# Spec guidelines

- Update what's there instead of appending, and cut anything the change makes redundant.
- Write one behaviour per scenario, so each can have its own test.
- Never change or reuse an ID, even after its scenario is removed.
- Write **Given** as the state already true, **When** as the one event, and **Then** as what an observer at the boundary sees, including after a failure.
- Give every scenario a reason that holds now: a caller's need, a product decision, an external contract or a project standard. The code doing it, "more robust" and "we might need it" are not reasons.
- Say exactly what happens: the system, the inputs, what the observer gets back, and the values that change it. Write "Asks the Notifications API to notify the loan's member, then records a reminder for today", not "Reminds the member". Leave out constants nothing depends on.
- Write for someone who hasn't read the code. Don't name internal parts such as a guard, hook or schema. Names an observer sees, such as `POST /loans`, are fine.
- Connect a domain word to the everyday word it narrows the first time a spec uses it, and never use an everyday word in a narrower sense without saying so.
- Set Verified to `service`, `integration`, `system`, `dependency <link>` for a guarantee from something we don't own, or `manual <link>` for a runbook step.
- In Terms, define only words the scenarios use and the glossary lacks.
- In Why, give reasons only. Put how something is built beside the code, what it used to be in the commit, and a consequential trade-off in an ADR.
- In Limitations, list only accepted consequences the subject doesn't recover from.
