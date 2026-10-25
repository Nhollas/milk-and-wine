# Intent judge trial

A trial of check 2 in [intent-testing-landscape.md](../intent-testing-landscape.md): can an agent that reads a row and its tests, but never the code, find the parts of the row its tests don't check?

The judge is [intent-judge](../../../.claude/agents/intent-judge/intent-judge.md). Its guard lets it read `specs/`, `tests/` and test files in `src/`, and nothing else. For each row, it splits the Given and Then into parts and marks each `checked`, `weak`, `missing` or `elsewhere`.

## How it was run

- **Six weakenings** of the reminders tests. Each drops one part of a row, and `pnpm test` still passes with each one. They are the five patches here and the B3 trial's [control](../b3-trial/control/weaker-b3-test.patch).
- **One judgement per weakening, plus one of the tests as they are.** [run.sh](run.sh) judges the whole reminders spec each time, in its own copy of the repo. The judge isn't told what was weakened.
- **Twice over.** Each judgement took about 65 seconds and cost about $0.30 on Opus 5.5. The verdicts are in [results/](results/).

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
2. **It finds gaps mutation misses.** The judge and the mutator caught different things, which is the reason both are required in the [workflow](../agent-workflow.md).
3. **One run isn't enough for real gaps.** The same gap showed in 3 to 12 of 14 judgements. Planted gaps were stable, but subtler ones weren't. Running it several times and taking every flag would catch more.
4. **"Weak" needs a policy.** Whether coverage by another row counts was a rule the judge had to be told. It now follows the requirement-killed definition.

## Not tested

- Other specs, or tests written by someone else.
- Whether people agree with its `weak` verdicts.
- The cost of running it several times on every MR.

The three real gaps are still in the tests. Fixing them changes what B1's and B5's tests check, so it's a change of its own.
