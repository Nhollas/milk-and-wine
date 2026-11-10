# Intent judge evals

Measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md). What it does, and the words for its parts, are in [its spec](../../specs/tools/intent-evals/spec.md). Each task is a [Harbor](https://harborframework.com) task, and Harbor runs the judge on it in a Docker container of its own.

## What's here

- `fixtures/<fixture>/` is a small made-up subject laid out like this repository: `specs/`, `src/` and, if it needs them, `tests/`. Its tests run only through `eval:check`.
- `judge-<number>-<slug>/` is one task: one thing the judge might get wrong. It's named for the mistake, and its number is its lasting name.
  - `README.md` says what the trap is, what the judge should report, and how hard the writer expects it to be.
  - `task.toml` names the task's fixture and difficulty, and gives Harbor its timeouts.
  - `instruction.md` is what the judge is asked.
  - `environment/` is everything the judge sees: a `Dockerfile`, then the fixture's spec and tests with the gap planted, and none of the code under test.
  - `tests/` is how Harbor grades a trial once the judge stops: `expected.json` says what the judge should report on the scenario, and `test.sh` runs the grader on its last reply.
  - `bug/` holds a change to the fixture's code that its tests catch until the gap is planted, for a task that expects `misses_requirement`, `checks_something_else` or `setup_hides_requirement`.
- `job.yaml` is how Harbor runs the judge: as the session's own agent, 6 trials a task, 4 at once. It mounts the judge from `.claude/agents/intent-judge/` and the grader into every container, so neither is copied into a task.
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

Runs every task. Needs Docker, [Harbor](https://harborframework.com/docs/getting-started/quick-start) and `CLAUDE_CODE_OAUTH_TOKEN`; `claude setup-token` makes one. Any Harbor flag can follow, such as `--include-task-name 'judge-003*'` or `--n-attempts 2`. The job is named for the time and the commit it ran on, so commit the judge before measuring it. `harbor view evals/intent-judge/results` shows each trial's conversation.

```bash
pnpm eval:gate
```

Checks the latest job against the targets in the spec, or the job folder given.

## Adding a task

1. Copy a task with the same expected verdict, and give it the next number.
2. Change the test files in `environment/` to plant the gap. Leave the spec as the fixture has it.
3. Set `tests/expected.json` and `instruction.md` to the scenario, and write `bug/` if the verdict needs one.
4. Run `pnpm eval:check`.
