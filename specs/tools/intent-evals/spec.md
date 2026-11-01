# Intent evals

Measures how well the [intent judge](../../../.claude/skills/intent-judge/agents/intent-judge.md) finds where tests don't match their scenarios. It plants gaps in examples and checks whether the judge reports them, and gives it tests that are right and checks that it reports nothing. It's for whoever decides whether to keep the judge, how to word it and which model runs it.

| Scope |  |
| --- | --- |
| **Owns** | Examples, the case folder and its format, each case's graders, `eval:check`, `eval:judge` and the pass marks. |
| **Depends on** | The intent judge, packaged as a plugin with its guard. [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals), which runs each case and scores its graders. `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. |
| **Excluded** | The judge's own instructions. Writing examples and cases; people and agents write them, and this tool checks and runs them. `pnpm check`, which never runs the judge. |

**Terms.** An _example_ is a small made-up subject, with spec, tests and code, that never changes with the app. A _case_ is one thing the judge might get wrong, staged in an example: a folder `evals/judge-<number>-<slug>/` in the judge's plugin, beside the examples in `evals/examples/`, named after what it tests, holding a `README.md` that says what the trap is and why it's tricky, a `plant.json` naming the example, the scenario, the kind, the difficulty its writer expects (easy, medium or hard) and the edits planted in the example's tests, and a `case.yaml` holding its _graders_: the checks `claude plugin eval` scores each run by. The kinds say what the planted tests do to the scenario: `misses_requirement` (no test checks something it says), `checks_something_else` (a test checks something near it instead), `setup_hides_requirement` (the setup can't show whether it holds), `contradicts_requirement` (a test expects the opposite), `adds_requirement` (a test checks something it doesn't say) and `tests_are_right` (nothing is wrong, and the judge should report nothing; the plant, if any, changes the tests without breaking that). A _problem_ is one thing the judge reports: a requirement of a scenario whose verdict isn't `aligned`, or an additional check whose verdict is `adds_requirement`. The judge's verdicts are named as the kinds are. A problem on a tests_are_right case is a _false positive_.

## Behaviour

### Checking cases

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A case folder, other than `examples/` or `results/`, isn't named `judge-<number>-<slug>`, its README doesn't start with a heading, its `plant.json` doesn't match the schema, or two cases share a number | `eval:check` runs | Prints `<path> is not valid:` and why, or `duplicate` with each case sharing the number, and exits `1` | service |
| B2 | A case names an example, or a scenario in it, that doesn't exist | `eval:check` runs | Reports `unknown` with the case and the name, and exits `1` | service |
| B3 | A case's edit `find` lines don't appear exactly once in their file, or the file is gone | `eval:check` runs | Reports `stale` with the case, and exits `1` | service |
| B4 | An example's tests fail, or a scenario verified by a test has none, with no case planted | `eval:check` runs | Reports that the example's tests must pass as they are, checks none of its cases, and exits `1` | service |
| B5 | A misses_requirement, checks_something_else or setup_hides_requirement case | `eval:check` runs the scenario's tests with the case's bug in the code, then with the gap planted too | Reports `not a gap` with the case if they pass with the bug alone, or still fail once the gap is planted, and exits `1` | service |
| B6 | A contradicts_requirement case | `eval:check` runs the scenario's tests with the gap planted, against the example's code as it is | Reports `not a gap` with the case unless they fail, and exits `1` | service |
| B25 | A tests_are_right case with a plant | `eval:check` runs the scenario's tests with the plant | Reports `fails` with the case if they fail, and exits `1` | service |
| B8 | Nothing B1 to B6 or B25 reports | `eval:check` runs | Prints `ok` and each case's kind, difficulty and README heading, then `eval:check passed`, and exits `0` | service |

### Judging the examples

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B9 | Cases pass `eval:check` | `eval:judge` runs | `claude plugin eval` judges each case 6 times, or `--runs`, on the model the judge's definition names, or `--model`, up to 4 at once. Each run starts in an empty workspace that the case's `fixture.sh` fills with its example, plant applied, and asks the judge about the case's scenario only | dependency [claude plugin eval](https://code.claude.com/docs/en/plugin-evals) |
| B10 | A planted case | A run is graded | Its `found` grader passes when the reply holds a problem on the case's scenario, judged the case's kind, whose words contain the case's quote of it, or, for an adds_requirement case, whose test line is the case's planted line | manual [case.yaml](../../../.claude/skills/intent-judge/evals/judge-001-prices-that-never-need-rounding/case.yaml) |
| B13 | A tests_are_right case | A run is graded | Its `reports-nothing` grader passes when the reply holds no problem on the case's scenario | manual [case.yaml](../../../.claude/skills/intent-judge/evals/judge-003-odd-line-that-shows-the-rounding/case.yaml) |
| B12 | Any case | A run is graded | Its `never-reads-the-code` grader passes when nothing in the run read the example's code under test, and `ran-the-judge` when the intent-judge agent ran. A run that read the code is wrong whatever it found | manual [case.yaml](../../../.claude/skills/intent-judge/evals/judge-001-prices-that-never-need-rounding/case.yaml) |
| B11 | A run breaks: claude fails, the run hits its turn or time cap, or the reply isn't the judge's JSON | A run is graded | Its `found` or `reports-nothing` grader fails, as a miss does, and the result records the run's error beside its score | dependency [claude plugin eval](https://code.claude.com/docs/en/plugin-evals) |
| B15 | Every run is graded | `eval:judge` finishes | Writes `aggregate-result.json`, `report.html` and each run's trace under the plugin's `evals/results/<commit>-<date>/`, and prints a table: each case's score, the share of its runs that passed every grader, its runs and cost, then the total cost and time | dependency [claude plugin eval](https://code.claude.com/docs/en/plugin-evals) |
| B16 | A case's score is below `--threshold`, 0.95 unless given | `eval:judge` finishes | Exits `1` | dependency [claude plugin eval](https://code.claude.com/docs/en/plugin-evals) |

### Comparing results

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B23 | Two saved results | `eval:compare <a> <b>` runs | Prints them side by side, case by case and total by total, marking a total `better` or `worse` only when the two ranges don't overlap, and `no clear difference` otherwise | service |
| B24 | A result named doesn't exist | `eval:compare <a> <b>` runs | Prints `no result at <path>`, and exits `1` | service |

### Pass marks

A run is right when every grader passes: it found the case's gap, or reported nothing on a tests_are_right case, and never read the code.

| Measure      | Pass mark                     | How                                        |
| ------------ | ----------------------------- | ------------------------------------------ |
| Easy cases   | Right in at least 95% of runs | `eval:judge`, which gates at 0.95          |
| Medium cases | Right in at least 75% of runs | `eval:judge --tag medium --threshold 0.75` |
| Hard cases   | Reported, not pass or fail    | `eval:judge --tag hard --threshold 0`      |

**Why**

- **B5, B6:** A wrong case marks the judge down for being right, and a hard case no model finds might be wrong rather than hard. So each case is checked without the judge. An adds_requirement case can't be checked this way: no bug gets past an extra check. Its README has to say why the scenario doesn't ask for it instead.
- **B9:** The judge sees only the example, so nothing in the app can confuse it, and examples never change with the app, so cases don't go stale. `claude plugin eval` runs each case in a fresh home with nothing of this repository loaded but the plugin, and hides the case files from the agent, which is stricter than a copy of the repository ever was.
- **B10:** The judge quotes the scenario's words and names its verdict from a list named as the kinds are, so a case's grader is one regex over the judge's JSON: the scenario, the words and the kind, in the order the judge writes them. A judge that quotes the right words under another verdict has told its reader something else is wrong, and that counts as a miss rather than hiding in a pass. The judge is run as a subagent of a session that relays its reply, because `claude plugin eval` grades the session's last message.
- **B11:** A judge that breaks finds nothing for whoever relies on it, so a broken run counts against it, and the result still shows its error apart from a miss.
- **B12:** A judge that read the code under test has seen the answer, so its findings mean nothing. The plugin's hook blocks the read, in the judge only, since a plugin's hooks run in every session that loads it and a plugin agent's own frontmatter hooks are ignored; the grader proves it never happened, in the judge or in the session around it.
- **B13:** On a run with a gap planted, anything else the judge reports is ambiguous: a false positive, or the planted gap in other words. A tests_are_right case says the judge should report nothing, so every problem on it is a false positive and nobody has to read them. One that turns out to be a real gap in the example is fixed in the example, once. A tests_are_right case is a case like any other: it has a difficulty, and it passes or fails by the same marks.
- **B15:** The judge is its definition and guard in this repository, so the commit that holds them names its version, and `eval:judge` files each result under it. A result from an uncommitted edit carries the commit it was made on, so commit the judge before measuring it. The report and the table are `claude plugin eval`'s own, so a reader of any plugin's evals reads these the same way.
- **B23:** The judge's answers vary, so a difference between 4 of 6 and 5 of 6 can be luck. A range shows how sure a rate is, so `eval:compare` works out each total's 95% range from the saved runs.
- **B25:** A tests_are_right case's plant must leave the tests passing, or it has planted a gap and the case is lying about its kind.
- **Case folders:** A case is read by a person deciding whether the judge is worth keeping, so its folder is named after the judge's mistake it stages, not the example it uses, and its README says what the trap is before any JSON says how it's planted. The number is the case's lasting name: it survives a reworded slug, so old results still match, and `--case 'judge-003*'` runs it. Kinds are named for what the planted tests do to the scenario, so a kind reads without a glossary. The folders live in the judge's plugin because `claude plugin eval` reads a suite from there, and so that the judge and what measures it travel together.
- **Pass marks:** Set before the first full run, so its results can't bend them. They're revisited once, after it, with the reason for any change written down. False positives were a mark of their own, at most 1 in 5 problems judged by a person; tests_are_right cases put them under the marks by difficulty, with the planted cases. `--threshold` is one number per invocation, so each difficulty's mark is its own invocation by tag.

## Limitations

- The judge only reads this repository's layout, so examples are laid out the same way.
- A case is found only when a problem quotes its scenario's words, or points at its planted line. A judge that finds the gap in other words isn't counted.
- `--threshold` gates a case's score, the mean over its runs of the share of graders that passed, not the share of runs that passed every grader, which the table's `PASS%` column shows. The two differ only when a run fails a guard grader and passes the rest.
- A broken run and a miss score the same; only the result's `error` tells them apart.
- A case's quote lives in `plant.json`, for a reader, and again in its `found` grader's regex. Change both.
- Results are compared by hand until B23 is built.
