# Intent judge trial

A trial of check 2 in [intent-testing-landscape.md](../intent-testing-landscape.md): can an agent that reads a row and its tests, but never the code, find the parts of the row its tests don't check?

The judge is [intent-judge](../../../.claude/agents/intent-judge/intent-judge.md). Its guard lets it read `specs/`, `tests/` and test files in `src/`, and nothing else. For each row, it splits the Given and Then into parts and marks each `checked`, `weak`, `missing` or `elsewhere`.

## How it was run

- **Six weakenings** of the reminders tests. Each drops one part of a row, and `pnpm test` still passes with each one. They are the five patches here and the B3 trial's [control](../b3-trial/control/weaker-b3-test.patch).
- **One judgement per weakening, plus one of the tests as they are.** [run.sh](run.sh) judges the whole reminders spec each time, in its own copy of the repo. The judge isn't told what was weakened.
- **Twice over.** Each judgement took about 65 seconds and cost about $0.30 on Opus 5.5. The verdicts are in [results/opus/](results/opus/).

The sections up to [Making it consistent](#making-it-consistent) are this first round, on Opus.

## Planted gaps: 12 of 12 found

| Patch                      | Part it drops                                  | Run 1   | Run 2   |
| -------------------------- | ---------------------------------------------- | ------- | ------- |
| 1-b1-drops-sent-on         | B1 "for today"                                 | weak    | weak    |
| 2-b2-drops-not-yet-overdue | B2 Given "or isn't overdue"                    | missing | missing |
| 3-b4-drops-failed-count    | B4 "`failed` count"                            | missing | missing |
| 4-b5-drops-template        | B5 `"template": "loan-overdue"`                | weak    | weak    |
| 5-b5-drops-unreachable     | B5 "a failed connection as refused"            | missing | missing |
| weaker-b3-test             | B3 "with `loanId`" and "the refusal's `error`" | missing | missing |

Patches 1 and 4 are `weak`, not `missing`, because another test happens to pin the part. B3's test checks the `sent_on` of the reminder it does send, and the borrow-a-book journey test checks the template. Neither of those rows promises that part, so the judge says where it's pinned and doesn't count it.

### The first version said "elsewhere"

The first two runs used a looser rule: `elsewhere` meant any other row's test proves it. That time, the judge marked patches 1, 2 and 4 `elsewhere` in 4 of 6 judgements. It was right each time. Planting the bug made another row's test fail.

But none of those rows promises the part, so the coverage is luck. That's the point of a requirement-killed mutant: only the row's own test counts. The rule now says `elsewhere` needs another row that says the same thing, and anything else is `weak`. The results above are from after that change.

## Real gaps: 3 found in tests thought good

On the tests as they are, the judge flagged three parts. Each is a real gap. Planting the bug it points at leaves the whole suite passing.

| Part | Bug the suite misses | Flagged in |
| --- | --- | --- |
| B1 Given "before today (UTC)" | Working out today in local time. The suite catches it at UTC+14, not in London | 12 of 14 |
| B5 "any other answer … as refused" | Counting a `5xx` as accepted. Only a `400` is tried | 6 of 14 |
| B1 Given "it has no reminder recorded today" | A reminder from any earlier day blocking today's. That breaks the next-day retry in B3's Why | 3 of 14 |

"Flagged in" counts all 14 judgements, since each one judges the whole spec.

The spec mutator missed all three. Its mutant for "any other answer … as refused" refuses only `5xx`, which the `400` test kills; it never tried the other side. Its B2 mutant changes `sent_on = ?` to `sent_on < ?`, which B2's test kills; it never dropped the date. It wrote no mutant for UTC.

There were no false alarms. Every `weak` or `missing` verdict in the 14 judgements was a planted gap, one of these three, or a direct result of a planted gap: with patch 5, B3's Given "or can't be reached" loses the B5 test it relied on.

The one `"not mutated"` entry in [mutants.json](../../../specs/modules/reminders/mutants.json), B1's "then (asks before it records)", was marked `elsewhere` against B3 every time. That's right: B3 says a refused reminder records nothing.

## What it shows

1. **It finds dropped parts.** 12 of 12, on one spec with six patches. That's a small sample.
2. **It finds gaps mutation misses.** The judge and the mutator caught different things, so neither replaces the other.
3. **One run isn't enough for real gaps.** The same gap showed in 3 to 12 of 14 judgements. Planted gaps were stable, but subtler ones weren't. The next section works on that.
4. **"Weak" needs a policy.** Whether coverage by another row counts was a rule the judge had to be told. It now follows the requirement-killed definition.

## Making it consistent

The judge's reasons showed why it missed real gaps, so each change below targets one cause, and [score.ts](score.ts) measures it. Each round is 14 judgements: the seven variants, twice.

The agents now run on Sonnet 5.5, so the first step was to score Sonnet as it was. A judgement takes about 40 seconds and $0.12 on Sonnet.

### The scorecard

`score.ts` counts, for each known gap, how many judgements flagged it `weak` or `missing`. Every other flag is either on its list of false alarms, which were checked by hand, or reported as unexpected, to check by hand. Whenever a round found a new real gap, it was added and every earlier round was scored again, so all the columns are scored against the same list.

A gap is real when planting the bug it points at leaves the whole suite passing, or when only a test whose row doesn't promise it catches the bug.

| Gap                                    | Opus | Sonnet | Fix 1 | Fix 2 |
| -------------------------------------- | ---- | ------ | ----- | ----- |
| B1 today in UTC                        | 12   | 2      | 11    | 13    |
| B1 no reminder recorded today          | 3    | 0      | 14    | 14    |
| B5 any other answer refused            | 6    | 0      | 6     | 12    |
| B5 any `2xx` accepted                  | 0    | 0      | 1     | 9     |
| B4 finished only when the job finishes | 0    | 0      | 5     | 6     |
| B3 no retry within a run, from its Why | 0    | 0      | 0     | 1     |
| B1 overdue by more than a day, luck    | 0    | 0      | 0     | 2     |
| B5 keeps `NOTIFY_URL`'s path, luck     | 0    | 0      | 0     | 1     |
| Planted gaps, of 12                    | 12   | 12     | 12    | 12    |
| False alarms                           | 0    | 1      | 4     | 5     |

The real gaps are out of 14 judgements. Opus wasn't rerun with the fixes.

### Fix 1: try every plausible bug

**Cause.** The judge imagined one bug per part, and that bug decided the verdict. For "any other answer … as refused", it imagined "refuses only `5xx`", which the `400` test catches, and marked the part checked. When it imagined "accepts a `5xx`" instead, it marked it weak.

**Change.** List the bugs for each part in every direction, find the test line that catches each one, and mark the part `checked` only if every one is caught. The output now shows the bugs it tried. The prompt's examples are generic, not the known gaps, so the scorecard can't simply be taught its answers.

**Result.** "No reminder recorded today" went from 0 to 14, and UTC from 2 to 11. It also found two new real gaps, in B4 and B5. False alarms went from 1 to 4.

### Fix 2: split finely

**Cause.** Every remaining UTC miss merged "(UTC)" into "before today", and then never tried a time zone bug. Most "any other answer" misses merged it with "with a reason naming the status".

**Change.** Each case joined by "or" is its own part, and so is each word that narrows another, such as a unit, a time zone, a boundary or anything in brackets.

**Result.** UTC went to 13, "any other answer" from 6 to 12, and "any `2xx`" from 1 to 9. A third fix aimed at parts covering a range of values was planned, but splitting on "or" fixed most of it. False alarms went from 4 to 5.

### Where it stands

- **Planted gaps are stable.** 12 of 12 in every round.
- **Most real gaps are found most of the time.** Four of the eight are flagged in 9 to 14 judgements of 14.
- **Two are still rare.** "Finished only when the job finishes" is flagged 6 times, and "no retry within a run" once. The second comes from B3's Why note, which the judge isn't told to read.
- **False alarms are the cost.** 5 in 14 judgements. Three are bugs nobody would write, such as sending a loan due far in the future. One is a part whose own reason says another row proves it, so it should have said `elsewhere`.

The next fixes would be:

1. Keep only bugs a developer could plausibly write, and mark a part `elsewhere` when the judge's own reason says another row proves it.
2. Read a row's Why note as part of the row.

## Not tested

- **Other specs, or tests written by someone else.** Every fix was measured on the reminders spec alone, so it may be tuned to it. A fresh spec with new planted gaps would show that.
- **Whether people agree with its `weak` verdicts.**
- **The cost of running it on every MR.**

The real gaps are still in the tests. Fixing them changes what B1's, B3's, B4's and B5's tests check, so it's a change of its own.
