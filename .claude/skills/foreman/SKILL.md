---
name: foreman
description: Deliver a change spec's tickets through an agent team, one ticket at a time, each through five teammates and out as a PR.
argument-hint: <change spec issue, such as #42>
compatibility: Requires interactive Claude Code with agent teams enabled.
disable-model-invocation: true
---

Lead one change spec's tickets from failing tests to PRs. You own the order, the handoffs between teammates and the PRs. Teammates write the tests and the code; you never do.

Use the user's request: $ARGUMENTS

1. **Load the change spec.** Read it, its tickets and each ticket's blockers, with the commands in [the GitHub notes](references/github.md). A ticket is ready when it's open, has no open PR, and every ticket blocking it is closed. If none is ready, say which PRs the user needs to merge, and stop.
2. **Check the team can run.** Read [the team notes](references/agent-teams.md). Agent teams must be enabled and you must have `Agent` and `SendMessage`. If not, say so and stop; never do a teammate's work yourself or with an ordinary subagent.
3. **Start the ticket.** Take the first ready ticket in the change spec's landing order. Check the working tree is clean, then create `ticket/<n>-<slug>` from the latest `origin/main` and check it out. Tickets run one at a time, in this checkout, because the intent judge's and mutant writer's guards only read the repository's own `specs/`, `src/` and `tests/`.
4. **Write the tests.** Spawn a `test-writer` for the ticket. Keep it running until step 7 passes, for the fixes that come back to it.
5. **Judge them.** Spawn a fresh `intent-judge:intent-judge` with the subject and the ticket's scenario IDs. Send every requirement it doesn't find `aligned`, and every `adds_requirement`, to the test writer, then judge again with a fresh judge. Move on once every requirement is aligned and nothing is added.
6. **Make them pass.** Spawn an `implementer` with the test writer's commit. Keep it running until step 8 passes.
7. **Try to break them.** Spawn a fresh `mutant-writer` with the subject and the ticket's scenario IDs. When it finishes, commit its `mutants.json` as `test(<subject>): mutants for <IDs>`, and run `pnpm spec:mutants <subject>`. Send each mutant that survives in one of the ticket's scenarios to the test writer, and once it has strengthened the test, run it again. Report survivors in other scenarios to the user without acting on them.
8. **Review the standards.** Spawn a `standards-reviewer` with the base commit, the implementer's Verification section, and the implementer and test writer to send findings to. Move on when it says the change is ready. If a fix changes a test, go back to step 5 for that scenario.
9. **Open the PR.** Push the branch and open the PR with `gh pr create`, from [the PR template](assets/pr.md): `Closes #<n>`, what now works, the implementer's Verification section, and what the judge and the mutants found. Shut the ticket's teammates down, check out `main`, and go back to step 1. A ticket that a still-unmerged PR blocks waits for the user to merge it.
10. **Hand over.** Give the user each PR's link, and anything unresolved: a teammate's blocker, a disagreement, or a check that couldn't run. Once the last ticket's PR merges, the change spec's last step is the user's: move any decision that should outlast it into an ADR, then close it.

Escalate a behaviour question, a test that looks wrong, or two scenarios that can't both hold to the user. Don't settle it, and don't let a teammate settle it.
