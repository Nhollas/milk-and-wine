# Intent evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md). What it does, and the words for its parts, are in [its spec](../../specs/tools/intent-evals/spec.md).

- `examples/<example>/` is a small made-up subject laid out like this repository: `specs/`, `src/` and, if it needs them, `tests/`. Its tests run only through these tools.
- `cases/judge-<number>-<slug>/` stages one thing the judge might get wrong. Read its `README.md` first: what the trap is, what the judge should report, and why it's tricky. Its `case.json` says which example and scenario it uses, its kind and difficulty, and the edits planted in the example's tests. `pnpm eval:check` proves each case is a gap, or that its tests still pass when they should be right, without running the judge.
- `pnpm eval:judge [--case 3] [--runs 6] [--models a,b] [--parallel 4]` runs the judge on each case: a planted case should be reported, a tests_are_right case shouldn't. The report lists every case with pass or fail and the pass rate; the saved `runs.json` beside it holds every run.
