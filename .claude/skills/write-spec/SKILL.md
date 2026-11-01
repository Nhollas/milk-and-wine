---
name: write-spec
description: Agree a behaviour spec with the user in a shared doc, then write it to specs/.
argument-hint: <subject or idea>
disable-model-invocation: true
---

Use the user's request: $ARGUMENTS

1. **Settle the behaviour.** Read the subject's spec, if it has one. Call the Skill tool with `grilling`.
2. **Draft in a doc.** Call the Skill tool with `anthropic-skills:docs` and draft the spec there from [the template](assets/spec.md), following the rules below. For an existing subject, start from its spec with the agreed changes drafted in. Without docs, draft in the spec file and review it there.
3. **Refine from comments.** When the user has commented, read every comment, change the doc and reply in each thread. Put behavioural choices to the user; don't settle them yourself.
4. **Write it once agreed.** Only when the user says the doc is agreed, write it to `specs/<kind>/<subject>/spec.md`, where `<kind>` is `journeys`, `modules` or `tools` and the folder name is unique. Add `test.todo("B<n>: …")` for each new scenario verified by a test, and run `pnpm check`. Tell the user the doc is now out of date and ask whether to delete it.

## Scenarios

One decidable behaviour per scenario. IDs are plain (`B1`, B for behaviour), stable, and never reused. **Given** is the state already true, **When** is the one event, **Then** is what an observer at the boundary sees, including after a failure.

- **Each scenario has a reason now:** a caller's need, a product decision, an external contract or a project standard. Existing code shows what happens today, not what must. "More robust" or "we might need it" isn't a reason, for retries, limits, validation and logging as much as features.
- **Say what happens.** Name the system, the resource and the inputs, and what the observer gets back. "Reminds the member" leaves the reader guessing; "Asks the Notifications API to notify the loan's member, then records a reminder for today" doesn't. The same goes for "handle", "valid", "reuse" and "fail".
- **Name what the observer sees, not the parts that do it.** A guard, a hook, a schema or a file the code uses isn't behaviour; say what it lets through, refuses or returns. This matters most when the subject is already built: its code's names are the first words to hand, and a spec copied from them describes today's implementation, not the behaviour we want.
- **Write for someone who hasn't read the code.** Every scenario should make sense from the spec and the glossary alone. Link a glossary term where the spec first uses it, and define anything else in place.
- **State the values that change what's observed:** a timeout's length and what it covers, retries as total attempts, a log's event, level and fields. Leave out constants nothing depends on.
- **One owner per policy.** State it in one spec and link to it from the others.
- **The code doesn't decide.** Where the code or its tests differ from a scenario, the difference is wording to fix, a gap in the code, behaviour nobody needs, or a choice for Open questions. Tests can protect accidental behaviour too.
- **A limitation isn't a task.** An accepted race or missing recovery goes under Limitations. Making it a guarantee is a separate decision.

**Verified** names what proves the scenario. A scenario is proposed until that proof exists.

| Verified | Proven by | Delivered when |
| --- | --- | --- |
| `service` | A test in `<subject>[.<part>].service.test.ts` whose title starts with the ID | The test is active |
| `integration` | The same, in a `.integration.test.ts` file, against a stand-in for a system we don't own | The test is active |
| `system` | The same, in a `.system.test.ts` file | The test is active |
| `dependency <link>` | A guarantee from something we don't own | Declared |
| `manual <link>` | A runbook step | Never; always listed for sign-off |

## Terms and Why

- **Terms define words, nothing else.** Only words the scenarios use and the glossary lacks. What a file holds belongs beside that file.
- **Why gives a reason.** How something is built belongs beside the code, and what it used to be belongs in the commit.
- **Rewrite, don't append.** A change to the spec updates what's there, and cuts what it leaves redundant.
