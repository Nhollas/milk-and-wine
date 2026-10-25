# Intent evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md): given a row and its tests, does it find what the tests don't check?

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

- **Found the planted part:** a `weak` or `missing` verdict on a part whose words include the case's `part`. This is the headline number.
- **Flagged its row:** a flag on any part of the row. A row with other gaps scores here for the wrong reason, so read it second.
- **Control:** the subject's tests as they are. Every flag is listed to triage: a real gap to close in the tests, or a false alarm. Nothing marks one as a false alarm automatically.
- **Unusable:** no JSON, rows missing, or the guard let a forbidden read through. A judge that read code has seen the answer, so its verdicts aren't scored.
- **Inconsistent:** verdicts that contradict themselves, such as `checked` with a break nothing catches.

Raw verdicts go to `reports/intent-evals/`.

## Not done yet

- The control isn't clean. Gaps found by earlier trials are still in the reminders tests, so its flags can't be told apart from false alarms until they are closed.
- Planted gaps are easy. The dev cases are found in every run, so they can't show a change for the better. Harder cases need tests strong enough to plant them in.
- Don't run `--split heldout` while tuning. It exists to be run once.
