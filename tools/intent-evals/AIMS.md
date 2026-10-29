# What intent-evals must do

Intent-evals measures the [intent judge](../../.claude/agents/intent-judge/intent-judge.md), to settle three decisions:

| Decision                | What the suite has to show                               |
| ----------------------- | -------------------------------------------------------- |
| Keep or drop the judge  | Whether it meets the pass marks                          |
| Change its instructions | Whether the change made it better, worse or no different |
| Choose its model        | How well each model judges, and what each costs          |

It stays out of `pnpm check`. It's slow, its answers vary between runs, and every run uses model calls.

## What the judge must find

The judge reads a row and the tests whose titles start with the row's ID, and nothing else. It splits the row's acceptance criteria into each separate thing they say, such as every case, unit and limit, and looks for five kinds of mismatch with what the tests check:

| Kind | What's wrong | Example (reminders B3) |
| --- | --- | --- |
| 1. Unchecked | No test checks something the row says | No test looks at `loanId` |
| 2. Wrong thing checked | A test checks something near it instead | It checks that _a_ warning was logged, not that it's `reminder.failed` |
| 3. Setup can't show it | The test's setup can't show whether it holds | The refused loan is the last one, so "carries on with the other loans" is never seen |
| 4. Contradicted | A test expects the opposite of what the row says | The row says `warn`; the test expects `error` |
| 5. Unasked | A test checks something the row doesn't say | It checks the email's subject line |

## Two ways of judging

|  | Made-up examples | The app's tests |
| --- | --- | --- |
| What the judge reads | A made-up domain, with one gap planted in its tests | The app's tests as they are |
| Who knows the right answer | The case, written in advance | A person, judging each flag right or a false alarm |
| When it runs | Every eval run | On demand, for the whole app or one subject |
| What it measures | Gaps found, and false alarms | How many flags are right |

## Made-up examples

The examples are a made-up domain, separate from the library app, with spec rows, tests and code in the repository's usual layout. Work on the app never changes them. While judging one, the judge sees nothing else. Their untouched tests match their rows, so a flag on anything but the planted gap is a false alarm.

A case plants one gap of one kind in one row's tests. It names what the judge should flag: the thing the row says, in the row's exact words or, for an unasked check, the test line. It also states the difficulty its writer expects: easy, medium or hard. There are at least 2 cases for each kind and difficulty, about 30 in all. Hard cases that no model finds yet are welcome: they show whether a change helps.

A wrong case marks the judge down for being right, and a hard case no model finds might be wrong rather than hard. So every case is checked without the judge before it counts:

| Kind | The check |
| --- | --- |
| 1–3 | The row's tests fail with a bug the case carries, and pass with it once the gap is planted |
| 4 | The tests with the contradiction planted fail against the original code |
| 5 | A person has written a one-line reason why the row doesn't ask for the unasked check |

## The app's tests

A person judges each flag right or a false alarm, and that judgement is saved. A later flag is matched to a saved judgement by its row and the test file and line it points at, or by the row's words when it points at no line. A person is asked only about flags that match nothing saved, including those whose lines moved when the tests changed.

Each run shows its flags, their judgements, and the share judged right.

## Scoring

Each run of the judge on a case records one of these:

| Result | Means |
| --- | --- |
| Found | It flagged the planted gap: the thing the row says or, for an unasked check, the test line |
| Not found | It didn't |
| Broken | It gave no usable reply. Counts as not found, since a broken judge finds nothing |
| Forbidden read | It read something it may not, such as the code, so it saw the answer. Counts as not found, and is listed first |

Each run also counts its false alarms: anything else it flagged.

A near-miss, such as the right thing in other words, is put to a person once, and the verdict is saved.

## Reports on the made-up examples

Each run on the made-up examples saves a report showing:

- each case: how often it was found, out of how many runs, with a range for how sure that is (such as "4 of 6, between 30% and 90%"), beside its expected difficulty;
- totals for each kind and difficulty, and overall, for found and false alarms;
- each model: cost, time and broken runs;
- the latest share of flags on the app's tests judged right, and when the app's tests were last judged.

A change counts as better or worse only when the ranges of the totals don't overlap. Per-case rates show where the judge struggles, not whether it improved.

Each report is labelled with the judge's version, the model and the date, with the judge's raw replies beside it. Any two saved reports can be compared without rerunning either.

Every call to the judge has a spending limit, so one that runs on stops.

## Pass marks

| Measure                                        | Pass mark                  |
| ---------------------------------------------- | -------------------------- |
| Easy cases found                               | At least 95% of runs       |
| Medium cases found                             | At least 75% of runs       |
| Hard cases found                               | Reported, not pass or fail |
| False alarms on made-up examples               | At most 1 in 5 flags       |
| Flags on the app's tests a person judges right | At least 4 in 5            |

They are set before the first full run, so its results can't bend them. They're revisited once, after it, with the reason for any change written down.
