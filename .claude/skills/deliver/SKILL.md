---
name: deliver
description: Use when a ticket's scenarios need delivering from failing tests to reviewed code on the current branch. Give it the subject, such as "loans", then the scenario IDs.
argument-hint: <subject> <scenario IDs>
---

Deliver these scenarios on the current branch: $ARGUMENTS. Note the commit you start from as the base; if the branch already has commits past `main`, pick up from what they show.

Each step runs in a fresh subagent, spawned with `Agent` and its `subagent_type`, given the subject, the scenario IDs, the ticket's decisions if you have them, and what the step names. A subagent replies once, so work sent back to a step goes to a new subagent of that kind, with its last commit and each finding as what's wrong and what to do. A reply that doesn't say what it did, such as an empty or placeholder one, is a failure: check the branch for what it left, and send what's missing to a new subagent of that kind.

1. **Tests.** Spawn a `test-writer`.
2. **Judge.** Spawn an `intent-judge:intent-judge`. Send each requirement it doesn't find `aligned`, and each `adds_requirement`, to a test writer, then judge again. Done when every requirement is aligned and nothing is added.
3. **Code.** Spawn an `implementer`, with the test writer's commit.
4. **Mutants.** Spawn a `mutant-writer`. Commit its `mutants.json`, then run `pnpm spec:mutants <subject>`. Send each survivor in these scenarios to a test writer, and run again once it replies. Done when none of these scenarios' mutants survive.
5. **Standards.** Spawn a `standards-reviewer`, with the base and the implementer's evidence. Send findings on `src/` to an implementer and on tests to a test writer, then give a reviewer the findings and the fixes. Done when it has no findings. A fix that changes a test sends that scenario back to step 2.

## Deciding

When a step raises a choice you'd recommend an answer to, make it, and record it under Decisions to check, with what you weighed it against. A choice that's hard to reverse or binds later tickets also gets an ADR in `docs/adr/`, on this branch. Stop and reply with a question only when every answer would change what a scenario means, or two scenarios can't both hold.

When a check finds a scenario's wording behind a decision already made, reword it on this branch and list it under Spec changes. Add a scenario the same way when the ticket needs behaviour no scenario covers, and mark it new.

Once step 5 is done, reply with [the review template](assets/review.md) filled in, the last commit, and anything unresolved: a disagreement, a check that couldn't run, or mutants that survived in other scenarios.
