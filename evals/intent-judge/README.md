# Intent judge evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md). What it does, and the words for its parts, are in [its spec](../../specs/tools/intent-evals/spec.md). Each task is a [Harbor](https://harborframework.com) task, and Harbor runs the judge on it in a Docker container of its own.

## What's here

- `fixtures/<fixture>/` is a small made-up subject laid out like this repository: `specs/`, `src/` and, if it needs them, `tests/`. Its tests run only through `eval:check`. There are two, `discounts` and `waitlist`. The judge's instructions must never take an example from a fixture: a task whose answer is in the instructions measures whether the judge can read them.
- `judge-<number>-<slug>/` is one task: one thing the judge might get wrong. It's named for the mistake, and its number is its lasting name.
  - `README.md` says what the trap is and what the judge should report.
  - `task.toml` names the task's fixture, and gives Harbor its timeouts.
  - `instruction.md` is what the judge is asked.
  - `environment/` is everything the judge sees: a `Dockerfile`, then the fixture's spec and tests with the gap planted, and none of the code under test.
  - `tests/` is how Harbor grades a trial once the judge stops: `expected.json` says what the judge should report on the scenario, and under `fair` anything else the planted tests get wrong, each with the verdict that is true of it, which the judge may report too. `test.sh` runs the grader on its last reply.
  - `bug/` holds a change to the fixture's code that its tests catch until the gap is planted, for a task that expects `misses_requirement`.
- `job.yaml` is how Harbor runs the judge: as the session's own agent, 6 trials a task, 8 at once. It mounts the judge from `.claude/agents/intent-judge/` and the grader into every container, so neither is copied into a task.
- `check.ts`, `grade.ts` and `gate.ts` are `eval:check`, the grader and `eval:gate`. `task-files.ts` reads a task folder, and `workspace.ts` runs a fixture's tests with a task's files laid over it.
- `results/` is where Harbor writes each job. It isn't committed.

## Running it

```bash
pnpm eval:check
```

Proves each task's gap is real, or that its tests are right, without running the judge.

```bash
pnpm eval:judge
```

Runs every task. Needs Docker, [Harbor](https://harborframework.com/docs/getting-started/quick-start) and `CLAUDE_CODE_OAUTH_TOKEN`; `claude setup-token` makes one. Any Harbor flag can follow, such as `--n-attempts 2`, or `--path evals/intent-judge --include-task-name 'judge-003*'` to run some tasks. The job is named for the time and the commit it ran on, so commit the judge before measuring it. `harbor view evals/intent-judge/results` shows each trial's conversation.

```bash
pnpm eval:gate
```

Checks the latest job against the target in the spec, or the job folder given. Beside each task's mean reward it prints why a trial lost it: `noticed`, the share of trials that gave the gap a wrong verdict; `labelled`, the share that gave it the expected one; and `false alarms`, the mean number of other wrong verdicts a trial. Read these here, not in Harbor's own summary, which counts a task with no gap as noticing nothing.

## Adding a task

1. Copy a task with the same expected verdict, and give it the next number.
2. Change the test files in `environment/` to plant the gap. Leave the spec as the fixture has it.
3. Set `tests/expected.json` and `instruction.md` to the scenario, and write `bug/` if the verdict needs one. If planting the gap gets anything else wrong, list it under `fair` with its verdict, and say why in the README.
4. Run `pnpm eval:check`.
