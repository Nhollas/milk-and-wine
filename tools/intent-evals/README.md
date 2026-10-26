# Intent evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md): given a row and its tests, does it find where the tests are out of line with the row (a promise nothing checks, something the row doesn't say, a contradiction)? Whether a test is strong enough is not its job.

## A case

A case in `cases/<subject>/<id>.json` plants one gap in a spec's tests:

- `weaken` edits the tests so they stop checking `part` of `row`.
- `bug` is a change to the code that only the weakened tests miss.
- `split` is `dev` to tune against, or `heldout` to score once you have stopped tuning.

A case is real only if the row's own tests pass as they are, catch `bug`, and miss it once weakened. `pnpm eval:validate` checks that by running the tests, so the ground truth never comes from the judge or from anyone's opinion. Run it after the code or the tests change.

## Running the judge

```bash
pnpm eval:judge [--subject s] [--case id] [--split dev|heldout] [--runs 3] [--parallel 4] [--judge file] [--no-control]
```

Each run copies the repository, applies a case's `weaken` edits and runs the judge on that row only. The judge never sees `bug`, because it never reads code. `--judge` tries another definition of the judge without editing the repository.

- **Found the planted part:** a misalignment on the case's row whose `says` includes the case's `part`. This is the headline number.
- **Control:** the subject's tests as they are. Every misalignment is listed to triage: a real gap to close in the tests, or a false alarm. Nothing marks one as a false alarm automatically.
- **Unusable:** no structured output matching the schema, or the guard let a forbidden read through. A judge that read code has seen the answer, so its findings aren't scored.

Raw judgements go to `reports/intent-evals/`.

## Not done yet

- The control isn't clean. Gaps found by earlier trials are still in the reminders tests, so its flags can't be told apart from false alarms until they are closed.
- Planted gaps are easy. The dev cases are found in every run, so they can't show a change for the better. Harder cases need tests strong enough to plant them in.
- Don't run `--split heldout` while tuning. It exists to be run once.
