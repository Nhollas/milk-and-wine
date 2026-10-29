# Intent evals

Measures how well the [intent judge](../../../.claude/agents/intent-judge/intent-judge.md) finds where tests don't match their rows. It plants cases in examples and checks whether the judge flags them, and records a person's judgements on what the judge flags in the app's own tests. It's for whoever decides whether to keep the judge, how to word it and which model runs it.

| Scope |  |
| --- | --- |
| **Owns** | Examples, the case format, the judgements file, `eval:check`, `eval:judge`, `eval:app` and `eval:compare`, and the pass marks. |
| **Depends on** | The intent judge's definition and guard, run through the Claude Code CLI. `tools/specs`, to read rows. Vitest, to run a row's tests. |
| **Excluded** | The judge's own instructions. Writing examples and cases; people and agents write them, and this tool checks and runs them. `pnpm check`, which never runs the judge. |

## Behaviour

### Checking cases

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A case file doesn't match the case schema | `eval:check` runs | Prints `<path> is not valid:` and each schema error, and exits `1` | service |
| B2 | A case names an example, or a row in it, that doesn't exist | `eval:check` runs | Reports `unknown` with the case and the name, and exits `1` | service |
| B3 | A case's edit `find` lines don't appear exactly once in their file, or the file is gone | `eval:check` runs | Reports `stale` with the case, and exits `1` | service |
| B4 | An example's tests fail, or a row verified by a test has none, with no case planted | `eval:check` runs | Reports that the example's tests must pass as they are, checks none of its cases, and exits `1` | service |
| B5 | An unchecked, wrong-thing-checked or setup-can't-show-it case | `eval:check` runs the row's tests with the case's bug in the code, then with the gap planted too | Reports `not a gap` with the case if they pass with the bug alone, or still fail once the gap is planted, and exits `1` | service |
| B6 | A contradicted case | `eval:check` runs the row's tests with the gap planted, against the example's code as it is | Reports `not a gap` with the case if they pass, and exits `1` | service |
| B7 | Fewer than 2 cases share a kind and an expected difficulty | `eval:check` runs | Lists each such kind and difficulty under `too few cases`, without changing the exit code | service |
| B8 | Nothing B1 to B6 reports | `eval:check` runs | Prints `ok` and each case's kind, difficulty and what it plants, then `eval:check passed`, and exits `0` | service |

### Judging the examples

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B9 | Cases pass `eval:check` | `eval:judge` runs | Judges each case `--runs` times, 6 by default, on each model in `--models`, or the one the definition names. Each time the judge runs in a copy holding only the case's example, with the gap planted, and is asked about the case's row only | service |
| B10 | A run flags the case's row with words that contain the case's quote of it, or, for an unasked case, points at the case's test line | The run's reply is scored | The run is `found` | service |
| B11 | A run's reply doesn't match the reply schema, the CLI fails, or the call reaches its $2 spending limit | The run's reply is scored | The run is `broken`, and counts as not found | service |
| B12 | A run reads a file the guard forbids | The run's reply is scored | The run is `forbidden read`, counts as not found, and the report lists it before anything else | service |
| B13 | A run flags something B10 doesn't count, and the judgements file has a judgement matching it | The run's reply is scored | Counts it as `found` if judged the planted gap, and as a false alarm if judged a false alarm | service |
| B14 | A run flags something B10 doesn't count, and no judgement matches it | The run's reply is scored | Adds it to the judgements file with no judgement, and the report counts it under `unjudged` until a person judges it | service |
| B15 | Every run has a result | `eval:judge` finishes | Saves a report under `reports/intent-evals/` labelled with the judge's version, the model and the date, with each run's raw reply beside it, and prints it | service |
| B16 | A report is printed | It lists each case | Each case shows how many runs found it, out of how many, with a 95% range, beside its expected difficulty | service |
| B17 | A report is printed | It sums the runs | It shows found and false alarms for each kind and difficulty and overall, each with a 95% range, and for each model its cost, time and `broken` runs | service |
| B18 | A report is printed | It checks the pass marks | It shows each pass mark as `met`, `not met` or, with any flag unjudged, `pending`, with the latest share judged right from `eval:app` and its date | service |

### Judging the app's tests

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B19 | A subject, or none for every subject | `eval:app [--subject s]` runs | Runs the judge once in a copy of the repository, on every row of each subject verified by a test | service |
| B20 | A flag points at a test file and line, or at none | It's matched against the judgements file | It matches a judgement with the same row and file and line or, when it points at no line, the same row and the same words | service |
| B21 | A flag matches no judgement | `eval:app` finishes | Adds it to the judgements file with no judgement | service |
| B22 | Every flag is matched or added | `eval:app` finishes | Prints each flag with its judgement or `unjudged`, and the share of judged flags judged right, and saves that share and the date for B18 | service |

### Comparing reports

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B23 | Two saved reports | `eval:compare <a> <b>` runs | Prints them side by side, case by case and total by total, marking a total `better` or `worse` only when the two ranges don't overlap, and `no clear difference` otherwise | service |
| B24 | A report named doesn't exist | `eval:compare <a> <b>` runs | Prints `no report at <path>`, and exits `1` | service |

### Pass marks

| Measure                               | Pass mark                  |
| ------------------------------------- | -------------------------- |
| Easy cases found                      | At least 95% of runs       |
| Medium cases found                    | At least 75% of runs       |
| Hard cases found                      | Reported, not pass or fail |
| False alarms on the examples          | At most 1 in 5 flags       |
| Flags on the app's tests judged right | At least 4 in 5            |

**Why**

- **B5, B6:** A wrong case marks the judge down for being right, and a hard case no model finds might be wrong rather than hard. So each case is checked without the judge. An unasked case can't be checked this way: no bug gets past an extra check. Its schema requires a person's one-line reason why the row doesn't ask for it instead.
- **B9:** The judge sees only the example, so nothing in the app can confuse it, and examples never change with the app, so cases don't go stale.
- **B11:** A judge that breaks finds nothing for whoever relies on it, so a broken run counts against it, and is still shown apart from a miss.
- **B13, B14, B20:** The judge words the same thing differently from run to run. Matching on the row and the line it points at doesn't depend on wording, so a person judges each flag once.
- **B16, B17, B23:** The judge's answers vary, so a difference between 4 of 6 and 5 of 6 can be luck. A range shows how sure a rate is, and only totals carry enough runs to call a change better or worse.
- **Pass marks:** Set before the first full run, so its results can't bend them. They're revisited once, after it, with the reason for any change written down.

## Limitations

- A judgement matched by line goes stale when the tests change and the line moves, and the flag is asked about again.
- The judge only reads this repository's layout, so examples are laid out the same way.
- Totals by kind come from the case's kind. The judge doesn't say which kind it found.

## Open questions

- **How a person judges a flag.** Unjudged flags could be judged by editing the judgements file, or through prompts in the terminal at the end of a run. Recommended: edit the file, since it's committed, reviewable, and works for an agent too. Decision needed: file or prompts.
- **What labels a judge's version.** A definition passed with `--judge` may not be committed. Recommended: the commit plus a short hash of the definition's text. Decision needed: whether that's enough to tell versions apart.
