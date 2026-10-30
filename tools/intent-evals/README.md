# Intent evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md): given a scenario and its tests, does it find where the tests are out of line with the scenario (a promise nothing checks, something the scenario doesn't say, a contradiction)? It fills in a checklist: each part of the scenario, the test line that checks it, and whether that is aligned. Its misalignments are the parts that aren't, plus anything the tests check that the scenario doesn't say. Whether a test is strong enough is not its job.

## A case

A case in `cases/<subject>/<id>.json` plants one gap in a spec's tests:

- `weaken` edits the tests so they stop checking `part` of `scenario`.
- `bug` is a change to the code that only the weakened tests miss.

A case is real only if the scenario's own tests pass as they are, catch `bug`, and miss it once weakened. `pnpm eval:validate` checks that by running the tests, so the ground truth never comes from the judge or from anyone's opinion. Run it after the code or the tests change.

## Running the judge

```bash
pnpm eval:judge [--subject s] [--case id] [--runs 6] [--models sonnet,opus] [--parallel 4] [--judge file] [--no-control]
```

Each run copies the repository, applies a case's `weaken` edits and runs the judge on that scenario only. The judge never sees `bug`, because it never reads code. `--judge` tries another definition of the judge without editing the repository. `--models` runs every job on each model in place of the one the definition names, and reports them side by side. The judge isn't consistent yet, so use at least 6 runs: 3 can't tell a flaky case from bad luck.

- **Found the planted part:** a misalignment on the case's scenario whose `says` includes the case's `part`. This is the headline number.
- **Control:** the subject's tests as they are. Every misalignment is listed to triage: a real gap to close in the tests, or a false alarm. Nothing marks one as a false alarm automatically.
- **Unusable:** no structured output matching the schema, or the guard let a forbidden read through. A judge that read code has seen the answer, so its findings aren't scored.

Raw judgements go to `reports/intent-evals/`, with each run's transcript, so a miss shows what the judge read and said.

## Not done yet

- Planted gaps are easy. The cases are found in every run, so they can't show a change for the better. Harder cases need tests strong enough to plant them in.
