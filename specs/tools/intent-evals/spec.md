# Intent evals

Measures how well the [intent judge](../../../.claude/agents/intent-judge/intent-judge.md) finds where tests don't match their scenarios. It plants gaps in examples and checks whether the judge reports them, and gives it tests that are right and checks that it reports nothing. It's for whoever decides whether to keep the judge, how to word it and which model runs it.

| Scope |  |
| --- | --- |
| **Owns** | Examples, the case folder and its format, `eval:check`, `eval:judge` and `eval:compare`, and the pass marks. |
| **Depends on** | The intent judge's definition and guard, run through the Claude Code CLI. `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. |
| **Excluded** | The judge's own instructions. Writing examples and cases; people and agents write them, and this tool checks and runs them. `pnpm check`, which never runs the judge. |

**Terms.** An _example_ is a small made-up subject, with spec, tests and code, that never changes with the app. A _case_ is one thing the judge might get wrong, staged in an example: a folder `cases/judge-<number>-<slug>/` named after what it tests, holding a `README.md` that says what the trap is and why it's tricky, and a `case.json` naming the example, the scenario, the kind, the difficulty its writer expects (easy, medium or hard) and the edits planted in the example's tests. The kinds say what the planted tests do to the scenario: `misses-requirement` (no test checks something it says), `checks-something-else` (a test checks something near it instead), `setup-hides-requirement` (the setup can't show whether it holds), `contradicts-requirement` (a test expects the opposite), `adds-requirement` (a test checks something it doesn't say) and `tests-are-right` (nothing is wrong, and the judge should report nothing; the plant, if any, changes the tests without breaking that). A _problem_ is one thing the judge reports: a part of a scenario it marks not aligned, or something a test checks that it marks extra. A problem on a tests-are-right case is a _false positive_.

## Behaviour

### Checking cases

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A case folder isn't named `judge-<number>-<slug>`, its README doesn't start with a heading, its `case.json` doesn't match the schema, or two cases share a number | `eval:check` runs | Prints `<path> is not valid:` and why, or `duplicate` with each case sharing the number, and exits `1` | service |
| B2 | A case names an example, or a scenario in it, that doesn't exist | `eval:check` runs | Reports `unknown` with the case and the name, and exits `1` | service |
| B3 | A case's edit `find` lines don't appear exactly once in their file, or the file is gone | `eval:check` runs | Reports `stale` with the case, and exits `1` | service |
| B4 | An example's tests fail, or a scenario verified by a test has none, with no case planted | `eval:check` runs | Reports that the example's tests must pass as they are, checks none of its cases, and exits `1` | service |
| B5 | A misses-requirement, checks-something-else or setup-hides-requirement case | `eval:check` runs the scenario's tests with the case's bug in the code, then with the gap planted too | Reports `not a gap` with the case if they pass with the bug alone, or still fail once the gap is planted, and exits `1` | service |
| B6 | A contradicts-requirement case | `eval:check` runs the scenario's tests with the gap planted, against the example's code as it is | Reports `not a gap` with the case if they pass, and exits `1` | service |
| B7 | Fewer than 2 cases share a kind and an expected difficulty | `eval:check` runs | Lists each such kind and difficulty under `too few cases`, without changing the exit code | service |
| B25 | A tests-are-right case with a plant | `eval:check` runs the scenario's tests with the plant | Reports `fails` with the case if they fail, and exits `1` | service |
| B8 | Nothing B1 to B6 or B25 reports | `eval:check` runs | Prints `ok` and each case's kind, difficulty and README heading, then `eval:check passed`, and exits `0` | service |

### Judging the examples

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B9 | Cases pass `eval:check` | `eval:judge` runs | Judges each case `--runs` times, 6 by default, on each model in `--models`, or the one the definition names. Each time the judge runs in a copy holding only the case's example, with its plant applied, and is asked about the case's scenario only | service |
| B10 | A run reports a problem on the case's scenario whose words contain the case's quote of it, or, for an adds-requirement case, that points at the case's test line | The run's reply is scored | The run is `found` | service |
| B26 | A run's reply marks a part aligned, or marks something it noted not extra | The run's reply is scored | Neither is a problem, so neither finds a gap nor is a false positive | service |
| B11 | A run's reply doesn't match the reply schema, the CLI fails, or the call reaches its $2 spending limit | The run's reply is scored | The run is `broken`, and counts as not found | service |
| B12 | A run reads a file the guard forbids | The run's reply is scored | The run is `forbidden read`, counts as not found, and the report lists it before anything else | service |
| B13 | A tests-are-right case's run reports anything, or nothing | The run's reply is scored | The run is a `false positive`, or `clean`; a clean run is right, as a found one is | service |
| B14 | A tests-are-right case's run reported something | A report is printed | Lists each problem once under the case, with its scenario, words and test line, and how many runs reported it, so a person fixes the example or the judge | service |
| B15 | Every run has a result | `eval:judge` finishes | Saves a report under `reports/intent-evals/` labelled with the commit, the model and the date, with each run's raw reply beside it and the 95% range of each difficulty's share of runs right, and prints it without the ranges | service |
| B16 | A report is printed | It lists the cases | Every case, with its difficulty, the runs that found its gap, or for a tests-are-right case the runs that were false positives, out of its runs, and `✓` or `✗` against its difficulty's pass mark; a hard case gets neither | service |
| B17 | A report is printed | It sums the cases | The share of easy and medium cases that pass, then by each difficulty that has cases; a pass mark appears only beside what misses it | service |
| B18 | A report is printed | It ends | Lists broken runs with their failure only when there are any, then the model's cost and longest run. Several models get a block each | service |

### Comparing reports

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B23 | Two saved reports | `eval:compare <a> <b>` runs | Prints them side by side, case by case and total by total, marking a total `better` or `worse` only when the two ranges don't overlap, and `no clear difference` otherwise | service |
| B24 | A report named doesn't exist | `eval:compare <a> <b>` runs | Prints `no report at <path>`, and exits `1` | service |

### Pass marks

A run is right when it finds the case's gap, or reports nothing on a tests-are-right case.

| Measure      | Pass mark                     |
| ------------ | ----------------------------- |
| Easy cases   | Right in at least 95% of runs |
| Medium cases | Right in at least 75% of runs |
| Hard cases   | Reported, not pass or fail    |

**Why**

- **B5, B6:** A wrong case marks the judge down for being right, and a hard case no model finds might be wrong rather than hard. So each case is checked without the judge. An adds-requirement case can't be checked this way: no bug gets past an extra check. Its README has to say why the scenario doesn't ask for it instead.
- **B9:** The judge sees only the example, so nothing in the app can confuse it, and examples never change with the app, so cases don't go stale.
- **B26:** The judge is asked to note what it saw and then say whether it's a problem, so its reasoning comes before its verdict. A note it marks not a problem, such as a date the setup needs, then has somewhere to go other than the problem list.
- **B11:** A judge that breaks finds nothing for whoever relies on it, so a broken run counts against it, and is still shown apart from a miss.
- **B15:** The judge is its definition and guard in this repository, so the commit that holds them names its version. A report from an uncommitted edit carries the commit it was made on, so commit the judge before measuring it.
- **B13:** On a run with a gap planted, anything else the judge reports is ambiguous: a false positive, or the planted gap in other words. A tests-are-right case says the judge should report nothing, so every problem on it is a false positive and nobody has to read them. One that turns out to be a real gap in the example is fixed in the example, once. A tests-are-right case is a case like any other: it has a difficulty, and it passes or fails by the same marks.
- **B15, B23:** The judge's answers vary, so a difference between 4 of 6 and 5 of 6 can be luck. A range shows how sure a rate is, but it answers a question the printed report doesn't ask, so it goes in the saved report, where `eval:compare` reads it.
- **B16, B17, B18:** The printed report is the shape of any eval's: a row per case with its result and pass or fail, a summary against the pass marks, then cost. It names only what exists in this run: no difficulty without cases, no broken runs when none broke, and no pass mark beside a result that meets it.
- **B25:** A tests-are-right case's plant must leave the tests passing, or it has planted a gap and the case is lying about its kind.
- **Case folders:** A case is read by a person deciding whether the judge is worth keeping, so its folder is named after the judge's mistake it stages, not the example it uses, and its README says what the trap is before any JSON says how it's planted. The number is the case's lasting name: it survives a reworded slug, so old reports still match, and `--case 3` runs it. Kinds are named for what the planted tests do to the scenario, so a kind reads without a glossary.
- **Pass marks:** Set before the first full run, so its results can't bend them. They're revisited once, after it, with the reason for any change written down. False positives were a mark of their own, at most 1 in 5 problems judged by a person; tests-are-right cases put them under the marks by difficulty, with the planted cases.

## Limitations

- The judge only reads this repository's layout, so examples are laid out the same way.
- Totals by kind come from the case's kind. The judge doesn't say which kind it found.
- A case is found only when a problem quotes its scenario's words, or points at its planted line. A judge that finds the gap in other words isn't counted.
