# Intent evals

Measures how well the [intent judge](../../../.claude/agents/intent-judge/intent-judge.md) finds where tests don't match their scenarios. Each task plants a gap in a fixture's tests, or leaves them right, and [Harbor](https://harborframework.com) runs the judge on it in a container of its own and grades its reply. It's for whoever looks after the judge: how to word it, which model runs it, and whether it still meets its targets. [The evals README](../../../evals/intent-judge/README.md) says where everything lives and how to run it.

| Scope |  |
| --- | --- |
| **Owns** | Fixtures, the task folder, `eval:check`, the grader, `eval:gate` and the targets. |
| **Depends on** | The intent judge. Harbor and Docker, which run each trial. `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. |
| **Excluded** | The judge's own instructions. Writing fixtures and tasks; people and agents write them, and this tool checks and grades them. `pnpm check`, which never runs the judge. |

**Terms.** A _fixture_ is a small made-up subject, with spec, tests and code, that never changes with the app. A _task_ is one thing the judge might get wrong, staged on a fixture, as a Harbor task folder. Its environment holds the fixture's spec and tests, with the task's _gap_ planted in the tests, and none of the code under test. Its _expected verdict_ is what the judge should report on the task's scenario, in the judge's own verdicts: `aligned` when nothing is wrong, or the verdict for what the gap does. A task's _fair findings_ are the other things its planted tests get wrong, each with the verdict that is true of it, which the judge may report as well. A _wrong verdict_ is one that says a scenario's tests are wrong: `misses_requirement`, `contradicts_requirement` or `adds_requirement`. A _false alarm_ is a wrong verdict on the task's scenario that neither its gap nor a fair finding accounts for. A task's _bug_ is a change to the fixture's code that the fixture's tests catch until the gap is planted. A _trial_ is one run of the judge on a task, and a _job_ is one Harbor run of trials.

## Behaviour

### Checking tasks

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A task folder, other than `fixtures/` or `results/`, isn't named `judge-<number>-<slug>` | `eval:check` runs | Prints `<path> is not valid:` and `the folder must be named judge-<number>-<slug>`, and exits `1` | service |
| B27 | A task's README doesn't start with a `#` heading | `eval:check` runs | Prints `<path> is not valid:` and `README.md must start with a # heading`, and exits `1` | service |
| B28 | A task's `task.toml` or `tests/expected.json` doesn't match the task format, or it expects `misses_requirement` with no `bug/` | `eval:check` runs | Prints `<path> is not valid:` and what's wrong, and exits `1` | service |
| B29 | Two tasks share a number | `eval:check` runs | Reports `duplicate` with each task sharing the number, and exits `1` | service |
| B2 | A task names a fixture, or a scenario in it, that doesn't exist | `eval:check` runs | Reports `unknown` with the task and the name, and exits `1` | service |
| B3 | A task's environment holds a file its fixture doesn't, or a spec that differs from its fixture's, or its `bug/` holds a file that isn't its fixture's code under test | `eval:check` runs | Reports `stale` with the task and the file, and exits `1` | service |
| B31 | A task's environment holds code under test | `eval:check` runs | Reports `leaks` with the task and the file, and exits `1` | service |
| B4 | A fixture's tests fail, or a scenario verified by a test has none | `eval:check` runs | Reports that the fixture's tests must pass as they are, checks none of its tasks, and exits `1` | service |
| B5 | A task expecting `misses_requirement` whose scenario's tests pass with its bug in the code | `eval:check` runs | Reports `not a gap` with the task, and exits `1` | service |
| B30 | A task expecting `misses_requirement` whose scenario's tests still fail with its bug once the gap is planted | `eval:check` runs | Reports `not a gap` with the task, and exits `1` | service |
| B6 | A task expecting `contradicts_requirement` whose scenario's tests don't fail against its fixture's code | `eval:check` runs | Reports `not a gap` with the task, and exits `1` | service |
| B25 | A task expecting `aligned` whose scenario's tests fail against its fixture's code | `eval:check` runs | Reports `fails` with the task, and exits `1` | service |
| B8 | Nothing B1 to B6, B25 or B27 to B31 reports | `eval:check` runs | Prints `ok` and each task's expected verdict, difficulty and README heading, then `eval:check passed`, and exits `0` | service |

### Grading a trial

The grader reads the judge's last reply in the trial and writes its rewards: `reward`, `false_alarms` and, for a task with a gap, `noticed` and `labelled`.

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B32 | A task expecting a verdict on a requirement | A trial is graded | `noticed` is 1 when the reply gives a requirement of the task's scenario a wrong verdict and quotes the expected words, in any case, and `labelled` is 1 when that verdict is the expected one; otherwise each is 0 | service |
| B33 | A task expecting `adds_requirement` | A trial is graded | `noticed` is 1 when the reply gives an additional check on the task's scenario a wrong verdict at the expected test line, and `labelled` is 1 when that verdict is `adds_requirement`; otherwise each is 0 | service |
| B39 | A task with a gap | A trial is graded | `false_alarms` counts the wrong verdicts on the task's scenario, less those on its gap under one verdict, the expected one if the reply gives it, and those on a fair finding under its verdict. A finding is on a gap or a fair finding when it's a requirement quoting its words, or an additional check at its test line | service |
| B34 | A task expecting `aligned` | A trial is graded | `false_alarms` counts every wrong verdict on the task's scenario | service |
| B40 | Any task | A trial is graded | `reward` is 1 when `false_alarms` is 0 and, for a task with a gap, `labelled` is 1; otherwise 0 | service |
| B35 | A trial whose last reply holds no JSON object | It's graded | Every reward is 0 | service |

### Gating a job

| Difficulty | Target                     |
| ---------- | -------------------------- |
| Easy       | Mean reward at least 0.95  |
| Medium     | Mean reward at least 0.75  |
| Hard       | Reported, not pass or fail |

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B36 | A job whose tasks each meet their difficulty's target | `eval:gate` runs | Prints each task's difficulty, mean reward, trials and target, then `eval:gate passed`, and exits `0` | service |
| B41 | A job whose trials carry `noticed`, `labelled` or `false_alarms` | `eval:gate` runs | Prints each one's mean over the task's trials that carry it, after the task's target | service |
| B37 | A job with a task below its difficulty's target | `eval:gate` runs | Marks the task `below`, prints `eval:gate failed · <count> below target`, and exits `1` | service |
| B38 | A job with a trial that broke before it was graded | `eval:gate` runs | Scores the trial 0 and counts it as broke | service |

**Why**

- **Containers:** The judge sees only the task's environment: no code under test, no task README saying what the trap is, nothing else in this repository. So nothing has to stop it reading the answer.
- **B5, B6, B30:** A wrong task marks the judge down for being right, and a hard task no model finds might be wrong rather than hard. So each task is checked without the judge. An `adds_requirement` task can't be checked this way, since no bug gets past an extra check, so its README says why the scenario doesn't ask for it.
- **B3:** A task holds its own copy of its fixture's spec and tests, so a reader sees exactly what the judge sees. The copy must not drift from the fixture.
- **Verdicts:** The judge has one verdict, `misses_requirement`, for a requirement its tests don't show, whether nothing checks it, the setup hides it or a test checks something else. It had three, and neither a judge without their definitions nor, at times, one with them could tell them apart, so every score was partly a score for the label. Its reasoning says which kind it is.
- **B32:** Seeing a gap and naming it are two skills, and a judge can lose either without the other. A judge that quotes the right words under another wrong verdict noticed the gap and told its reader something else is wrong.
- **B39:** A judge that cries wolf stops being read, so a false alarm costs the trial its reward. Planting one gap can open others: a single line for "every line" can't show a total either. A task lists those as fair, so the judge isn't marked down for being right. A fair finding names its verdict, because its words under another verdict tell the reader something untrue: that no test asserts a total, when one does. Saying a thing twice under one verdict, once for each test, isn't crying wolf, and saying it under two verdicts is.
- **B34:** On an `aligned` task everything the judge reports as wrong is a false alarm.
- **B40:** One number says whether a reader could act on the reply as it stands. The other three say why not.
- **B38:** A judge that breaks finds nothing for whoever relies on it.
- **Targets:** Set before the first full run, so its results can't bend them. Revisited once, after it, with the reason for any change written down.

## Limitations

- A gap is noticed only when the judge quotes its scenario's words, or points at its planted line. A judge that finds the gap in other words isn't counted, and one that quotes a whole Then under a wrong verdict is.
- Harbor and Docker must be installed, and a trial runs on `CLAUDE_CODE_OAUTH_TOKEN`.

## Open questions

None.
