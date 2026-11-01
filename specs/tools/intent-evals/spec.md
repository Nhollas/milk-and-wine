# Intent evals

Measures how well the [intent judge](../../../.claude/skills/intent-judge/agents/intent-judge.md) finds where tests don't match their scenarios. It plants gaps in examples and checks whether the judge reports them, and gives it tests that are right and checks that it reports nothing. It's for whoever decides whether to keep the judge, how to word it and which model runs it.

| Scope |  |
| --- | --- |
| **Owns** | Examples, the case folder and its format, `eval:check`, `eval:judge` and the pass marks. |
| **Depends on** | The intent judge, packaged as a plugin that keeps it from reading the code under test. [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals), which runs each case and scores each run. `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. |
| **Excluded** | The judge's own instructions. Writing examples and cases; people and agents write them, and this tool checks and runs them. `pnpm check`, which never runs the judge. |

**Terms.** An _example_ is a small made-up subject, with spec, tests and code, that never changes with the app. A _case_ is one thing the judge might get wrong, staged in an example, with a kind and the difficulty its writer expects: easy, medium or hard. [The evals README](../../../.claude/skills/intent-judge/evals/README.md) says what a case's folder holds. A case's _plant_ is its edits to the example's tests, each replacing `find` lines in a file. A _gap_ is what a plant leaves wrong with the tests. A case's _bug_ is one such edit to the example's code, which the tests catch until the gap is planted. A kind says what the planted tests do to the scenario: `misses_requirement` (no test checks something it says), `checks_something_else` (a test checks something near it instead), `setup_hides_requirement` (the setup can't show whether it holds), `contradicts_requirement` (a test expects the opposite), `adds_requirement` (a test checks something it doesn't say) and `tests_are_right` (nothing is wrong, and the judge should report nothing).

## Behaviour

### Checking cases

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A case folder, other than `examples/` or `results/`, isn't named `judge-<number>-<slug>` | `eval:check` runs | Prints `<path> is not valid:` and `the folder must be named judge-<number>-<slug>`, and exits `1` | service |
| B27 | A case's README doesn't start with a `#` heading | `eval:check` runs | Prints `<path> is not valid:` and `README.md must start with a # heading`, and exits `1` | service |
| B28 | A case's `plant.json` doesn't match the case format | `eval:check` runs | Prints `<path> is not valid:` and `plant.json:` with what's wrong, and exits `1` | service |
| B29 | Two cases share a number | `eval:check` runs | Reports `duplicate` with each case sharing the number, and exits `1` | service |
| B2 | A case names an example, or a scenario in it, that doesn't exist | `eval:check` runs | Reports `unknown` with the case and the name, and exits `1` | service |
| B3 | A case's edit `find` lines don't appear exactly once in their file, or the file is gone | `eval:check` runs | Reports `stale` with the case, and exits `1` | service |
| B4 | An example's tests fail, or a scenario verified by a test has none, with no case planted | `eval:check` runs | Reports that the example's tests must pass as they are, checks none of its cases, and exits `1` | service |
| B5 | A misses_requirement, checks_something_else or setup_hides_requirement case whose scenario's tests pass with its bug in the code | `eval:check` runs | Reports `not a gap` with the case, and exits `1` | service |
| B30 | A misses_requirement, checks_something_else or setup_hides_requirement case whose scenario's tests fail with its bug in the code, and still fail once the gap is planted too | `eval:check` runs | Reports `not a gap` with the case, and exits `1` | service |
| B6 | A contradicts_requirement case whose scenario's tests don't fail with the gap planted, against the example's code as it is | `eval:check` runs | Reports `not a gap` with the case, and exits `1` | service |
| B25 | A tests_are_right case whose scenario's tests fail with its plant | `eval:check` runs | Reports `fails` with the case, and exits `1` | service |
| B8 | Nothing B1 to B6, B25 or B27 to B30 reports | `eval:check` runs | Prints `ok` and each case's kind, difficulty and README heading, then `eval:check passed`, and exits `0` | service |

### Pass marks

A run is right when the judge ran, never read the example's code under test, and either reported the case's gap or, on a tests_are_right case, reported nothing on its scenario. The judge's verdicts are named as the kinds are, so reporting the gap means judging it the case's kind and quoting the scenario's words, or, for an adds_requirement case, pointing at the planted line. A run that breaks is wrong.

| Measure      | Pass mark                     | How                                        |
| ------------ | ----------------------------- | ------------------------------------------ |
| Easy cases   | Right in at least 95% of runs | `eval:judge`, which gates at 0.95          |
| Medium cases | Right in at least 75% of runs | `eval:judge --tag medium --threshold 0.75` |
| Hard cases   | Reported, not pass or fail    | `eval:judge --tag hard --threshold 0`      |

**Why**

- **B5, B6, B30:** A wrong case marks the judge down for being right, and a hard case no model finds might be wrong rather than hard. So each case is checked without the judge. An adds_requirement case can't be checked this way, since no bug gets past an extra check, so its README says why the scenario doesn't ask for it.
- **Examples:** The judge sees only the example, so nothing in the app can confuse it, and examples never change with the app, so cases don't go stale.
- **Right runs:** A judge that quotes the right words under another verdict has told its reader something else is wrong. One that read the code under test has seen the answer, so its findings mean nothing. One that breaks finds nothing for whoever relies on it.
- **tests_are_right cases:** On a planted case, anything else the judge reports could be a false alarm or the planted gap in other words. On a tests_are_right case everything it reports is a false alarm, so nobody has to read it. One that turns out to be a real gap in the example is fixed in the example, once.
- **Pass marks:** Set before the first full run, so its results can't bend them. They're revisited once, after it, with the reason for any change written down.

## Limitations

- The judge only reads this repository's layout, so examples are laid out the same way.
- A case is found only when the judge quotes its scenario's words, or points at its planted line. A judge that finds the gap in other words isn't counted.
- A broken run and a miss score the same; only the result's `error` tells them apart.

## Open questions

None.
