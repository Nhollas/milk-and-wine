# Workflow benchmark

Measures whether the foreman agent delivers a task's tickets better than the baseline agent, by running trials of each in [Harbor](https://github.com/harbor-framework/harbor) and grading them with the task's hidden tests. It evaluates delivery only: both agents start from an agreed spec and tickets, and are compared on how they turn them into tested code.

| Scope |  |
| --- | --- |
| **Owns** | Tasks and their checks, the foreman and baseline agents, the `bench` kind of issue tracker, the measures, and the results folder. |
| **Depends on** | [Harbor](https://docs.harborframework.com/), which runs each trial in its own Docker sandbox, uploads the hidden tests only once the agent is done, and records each trial's time and tokens. Claude Code, on a Claude subscription. Vitest, to run tests. Stryker, for the mutation score. |
| **Excluded** | Writing a spec and its tickets, which needs a person to agree them. Writing tasks: `/specify` and `/to-tickets` write their specs and tickets, and people write their hidden tests and solutions. The skills and subagents foreman uses. Agents that change `deliver`, such as foreman without the intent judge. |

## Behaviour

### Checking a task

A task is valid when it has every part, every scenario in its spec has a hidden test, and every hidden test starts with a scenario's ID, passes on the solution and fails on the starter code.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | No task folder has the name given | `bench:check <task>` or `bench:run <task>` runs | Prints `unknown task: <task>`, and exits `1` | service |
| B2 | The task lacks its spec, its issue, a ticket, its starter code, its hidden tests or its solution | `bench:check <task>` runs | Prints `<task> is not valid:` and each missing part, and exits `1` | service |
| B3 | A hidden test fails on the solution | `bench:check <task>` runs | Reports `fails on the solution` with the test's title, and exits `1` | integration |
| B4 | A hidden test passes on the starter code | `bench:check <task>` runs | Reports `passes on the starter code` with the test's title, and exits `1` | service |
| B5 | A scenario in the task's spec has no hidden test whose title starts with its ID | `bench:check <task>` runs | Reports `no hidden test` with the ID, and exits `1` | service |
| B6 | A hidden test's title starts with an ID the task's spec lacks | `bench:check <task>` runs | Reports `unknown-id` with the test's title, and exits `1` | service |
| B7 | A valid task | `bench:check <task>` runs | Prints `ok`, the number of scenarios and of hidden tests, then `bench:check passed`, and exits `0` | service |

**Why**

- **B3, B4:** A wrong hidden test marks every agent down for the same mistake, which reads as a gap in the spec. Checking it against code known to meet the spec, and code known not to, finds that before any trial is spent.
- **B5:** Nothing would grade a scenario with no hidden test, so a trial that skipped it would look fine.

### Running an experiment

`bench:run <task> --agent <agent> --trials <n>` runs `n` trials of each agent named, on each task named. One agent or both, one task or several, and one trial or many are all the same command. A trial times out after 2 hours.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B8 | The repository has uncommitted changes | `bench:run` runs | Prints `commit first: results name the commit they measured`, starts nothing, and exits `1` | service |
| B9 | A task named isn't valid | `bench:run` runs | Prints what's wrong with it, starts nothing, and exits `1` | service |
| B10 | A clean repository and valid tasks | A trial starts | Its sandbox holds a new git repository with only the task's spec, issue, tickets and starter code, `CODING-STANDARDS.md`, the project's config files, and an `ISSUE-TRACKER.md` at its root that says how to use the `bench` issue tracker. A foreman trial's also has `.claude/`, and what its skills read: `GLOSSARY.md`, `docs/adr/`, `docs/agents/issue-tracker/`, `tools/specs/` and `tools/spec-mutants/` | integration |
| B11 | A foreman trial's sandbox is ready | The trial starts | Runs `claude -p "/foreman <issue>"` once, with `ISSUE_TRACKER=bench` | integration |
| B12 | A baseline trial's sandbox is ready | The trial starts | Runs `claude -p "Deliver the tickets in <issue>. ISSUE-TRACKER.md says how to use the issue tracker."` once | integration |
| B13 | An agent follows the `bench` issue tracker | It puts a ticket up for review | Merges the ticket's branch into `main` with `--no-ff`, which closes the ticket | system |
| B14 | A trial's `claude` exits with an error, or the trial times out | The trial ends | Records it as broken, with the reason and what it measured so far, and the experiment goes on | integration |
| B15 | A trial's `claude` stops at the subscription's usage limit | The trial ends | Stops the experiment, keeps the results of trials already finished, prints `usage limit reached`, and exits `1` | integration |

**Why**

- **B8:** A result is evidence about one version of the workflow, so it has to name a commit that holds exactly it.
- **B10:** Both agents get the same task, standards and tracker, and nothing they could copy an answer from or that steers how they work. Baseline is Claude Code as anyone would have it, free to work however it likes. `.claude/` and the files its skills read are foreman's process, so only foreman gets them.
- **B11, B12, B13:** Both agents get the same instruction and finish in one session. Foreman stops when the next ticket waits on one still up for review, so in a trial putting a ticket up for review merges it, as a person would. A trial that stops to ask a question just ends: nobody answers, as in other coding benchmarks.
- **B14:** How often an agent breaks is part of what it costs, so a broken trial is counted, not run again.
- **B15:** Trials after the limit would all break for a reason that isn't the agent's.

### Measuring a trial

Every measure reads the trial's working tree as the agent leaves it, committed or not. None asks the agent to work a certain way: an agent that writes no tests of its own scores a mutation score of 0, and no false passes, since its tests told a reviewer nothing.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B16 | A trial has ended | It's measured | Records its wall-clock time, and its tokens by model, subagents included | integration |
| B17 | All of a scenario's hidden tests pass | The trial is measured | Counts the scenario passed. The pass rate is passed scenarios over the task's scenarios | service |
| B18 | The trial wrote tests of its own and none fail, and a scenario's hidden tests do | The trial is measured | Counts the scenario a false pass | service |
| B20 | A trial has ended | It's measured | Records Stryker's mutation score for the task's `src/` against the trial's own tests | service |
| B21 | A trial has ended | It's measured | Records the longest function in `src/`, in lines, and the highest cognitive complexity of any function there, tests left out | service |

**Why**

- **Measures:** The pass rate is the main one: how much of the spec an agent built. Time and tokens are pace. False passes and the mutation score are confidence at review: whether the agent's own tests would have warned a reviewer. The longest function and the highest complexity are how hard the code is to review.
- **B17:** A scenario with many hidden tests counts no more than one with a few.
- **B18:** A false pass is a bug a reviewer would have had to find alone, since the agent's tests said all was well.

### Results

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B22 | An experiment has ended | Its results are written | Writes `tools/benchmark/results/<commit>-<date>/` with `trials.json`, holding each trial's agent, task, measures and whether it broke, and `summary.md`, giving each agent's mean and min–max range for each measure and its count of broken trials | service |
| B23 | An experiment has ended | Its results are written | Also writes, for each trial, a record of everything its agent did and a diff of the code it changed. Git ignores both | integration |
| B25 | Every trial of every agent on a task passed all its hidden tests | `summary.md` is written | Marks the task `too easy to compare` | service |

**Why**

- **B22:** The numbers are what the experiment found, so they're kept in history. Broken trials are left out of the means and ranges, and counted beside them.
- **B23:** These are for looking into why one trial went the way it did, and are too big to keep in history.
- **B25:** A task every agent passes in full can't tell them apart, so it needs to be harder before its results mean anything.

## Limitations

- The usage limit decides how long an experiment takes, so it bounds how many trials a comparison gets.

## Open questions

None.
