---
name: deliver
description: Use when a ticket's scenarios need delivering from failing tests to reviewed code on the current branch. Give it the subject, such as "loans", then the scenario IDs.
argument-hint: <subject> <scenario IDs>
---

Deliver these scenarios on the current branch: $ARGUMENTS. Note the commit you start from as the base; if the branch already has commits past `main`, pick up from what they show.

Each step runs in a fresh subagent, spawned with `Agent` and its `subagent_type`, given the subject, the scenario IDs and what the step names. A subagent replies once, so work sent back to a step goes to a new subagent of that kind, with its last commit and each finding as what's wrong and what to do.

1. **Tests.** Spawn a `test-writer`.
2. **Judge.** Spawn an `intent-judge:intent-judge`. Send each requirement it doesn't find `aligned`, and each `adds_requirement`, to a test writer, then judge again. Done when every requirement is aligned and nothing is added.
3. **Code.** Spawn an `implementer`, with the test writer's commit.
4. **Mutants.** Spawn a `mutant-writer`. Commit its `mutants.json`, then run `pnpm spec:mutants <subject>`. Send each survivor in these scenarios to a test writer, and run again once it replies. Done when none of these scenarios' mutants survive.
5. **Standards.** Spawn a `standards-reviewer`, with the base and the implementer's evidence. Send findings on `src/` to an implementer and on tests to a test writer, then give a reviewer the findings and the fixes. Done when it has no findings. A fix that changes a test sends that scenario back to step 2.

At a behaviour question, a test that looks wrong, or two scenarios that can't both hold, stop and reply with it.

Once step 5 is done, reply with [the review template](assets/review.md) filled in, the last commit, and anything unresolved: a disagreement, a check that couldn't run, or mutants that survived in other scenarios.
