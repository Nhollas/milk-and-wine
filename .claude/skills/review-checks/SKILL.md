---
name: review-checks
description: Use when a built change's tests need checking against its scenarios before it goes up for review. Give it the subject, such as "loans", then the scenario IDs.
argument-hint: <subject> <scenario IDs>
---

Run the two review checks on these scenarios on the current branch: $ARGUMENTS. The change is already built: its code and tests are committed, and each scenario has a test with its ID in the title.

Each check runs in a fresh subagent, spawned with `Agent` and its `subagent_type`, given the subject and the scenario IDs. A subagent replies once, so a check that runs again runs in a new subagent. A reply that doesn't say what it found, such as an empty or placeholder one, is a failure: run the check again.

1. **Judge.** Spawn an `intent-judge`. Fix the tests for each requirement it doesn't find `aligned`, and for each `adds_requirement`, commit, then judge again. Done when every requirement is aligned and nothing is added.
2. **Mutants.** Spawn a `mutant-writer`. Commit its `mutants.json`, then run `pnpm spec:mutants <subject>`. Strengthen the tests for each survivor in these scenarios, commit, and run it again. Done when none of these scenarios' mutants survive. A fix that changes what a test checks sends that scenario back to step 1.

When a check finds a scenario's wording behind what was agreed, reword the scenario on this branch and list it under Spec changes. Stop and reply with a question only when every answer would change what a scenario means, or two scenarios can't both hold.

Once both are done, reply with [the review template](assets/review.md) filled in, the last commit, and anything unresolved: a disagreement, a check that couldn't run, or mutants that survived in other scenarios.
