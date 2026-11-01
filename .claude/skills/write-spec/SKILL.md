---
name: write-spec
description: Agree a behaviour spec with the user in a shared doc, then write it to specs/.
argument-hint: <subject or idea>
disable-model-invocation: true
---

Use the user's request: $ARGUMENTS

1. **Settle the behaviour.** Read the subject's spec, if it has one. Call the Skill tool with `grilling`.
2. **Draft in a doc.** Read [the spec rules](../../rules/specs.md). Call the Skill tool with `anthropic-skills:docs` and draft the spec there from [the template](assets/spec.md), following those rules. For an existing subject, start from its spec with the agreed changes drafted in. Without docs, draft in the spec file and review it there.
3. **Refine from comments.** When the user has commented, read every comment, change the doc and reply in each thread. Put behavioural choices to the user; don't settle them yourself.
4. **Write it once agreed.** Only when the user says the doc is agreed, write it to `specs/<kind>/<subject>/spec.md`, where `<kind>` is `journeys`, `modules` or `tools` and the folder name is unique. Add `test.todo("B<n>: …")` for each new scenario verified by a test, and run `pnpm check`. Tell the user the doc is now out of date and ask whether to delete it.
