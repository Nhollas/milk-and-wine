# Agent workflow: a strawman

Research notes, October 2026. Where context and responsibility sit between people and agents, from an intent to a merged change. It's a strawman: every part is open to challenge ([INTENT.md](../../INTENT.md)), and each step has to earn its place against the three goals there: pace, clarity and alignment, and confidence at review.

## 1. Two people, four phases

```
  INTENT HOLDER                    DELIVERY ENGINEER: anyone on the team, any time later
  ─────────────────────────────    ─────────────────────────────────────────────────────

  1 AGREE THE BEHAVIOUR            2 PICK UP           3 DELIVER, per MR     4 CLOSE
    intent ──▶ rows ──▶ rows MR      ticket ──▶          tests ──▶ code ──▶    keep what it
    merged as proposed               change spec         prove ──▶ review      taught, delete it
                                                         ──▶ merge
    ▲                                ▲
    └ the what, fixed here           └ the how, never the what
```

The person with the intent writes it down as rows, the team agrees them in a rows MR, and they land on main as proposed. The ticket points at the rows and says why now. Whoever picks it up reads the rows, not a retelling of them, so intent isn't lost or skewed in the handoff.

Delivery can't change a row. Anyone can flag one as wrong, but it only changes through another rows MR, reviewed like the first.

## 2. Who owns each step

| Phase | Step | Owner | Takes part |
| --- | --- | --- | --- |
| 1 | Intent arrives | Intent holder |  |
| 1 | Draft rows | Spec writer agent | Intent holder answers questions |
| 1 | Land the rows | Intent holder and team | `spec:check` |
| 2 | Pick up the ticket | Delivery engineer | `spec:status` |
| 2 | Slice the change | Planner agent | Engineer approves the slices |
| 3 | Start a slice | Lead agent | Engineer starts the team |
| 3 | Write tests from rows | Test author agent | Lead |
| 3 | Implement | Implementer agent | Hook locks test files |
| 3 | Mutate the intent | Spec mutator agent | `spec:mutants` replays |
| 3 | Judge the tests | Intent judge agent |  |
| 3 | Review the code | Reviewer agent | `pnpm check` |
| 3 | Accept the MR | Delivery engineer | Lead presents, `spec:check --base` |
| 4 | Keep what the change taught | Delivery engineer | Lead drafts |

People have three gates: landing the rows, approving the slices, and merging each delivery MR.

**Review the code** reads the slice's diff, code and tests, against the rows and [CODING-STANDARDS.md](../../CODING-STANDARDS.md). Faithfulness to the rows is the mutator's and judge's job, so the reviewer looks at what they can't see: code that no row needs, which [SPEC-DRIVEN-DEVELOPMENT.md §7](../../SPEC-DRIVEN-DEVELOPMENT.md) says takes judgement to find, and code that breaks the standards.

**Keep what the change taught** is the change template's "Before deleting this folder" checklist. The change spec is deleted with its last row, so anything worth keeping moves to a lasting home first: a decision with lasting trade-offs to an ADR, a new term to the glossary, a reason a row can't explain itself to that row's Why note, a limitation to its spec, and a lesson about the process to the templates.

## 3. Independence comes from what each agent can't see

```
                    rows    boundary   tests    code
  test author        ●         ●         ●        ✗     tests encode the row, not the code
  implementer        ●         ●         ●        ●     can't edit tests
  spec mutator       ●         ·         ✗        ●     mutants come from the row
  intent judge       ●         ·         ●        ✗     a skipped clause can't hide behind code
  reviewer           ●         ●         ●        ●     reads the diff before the account

  ● sees   ✗ withheld by design   · not needed
```

Adding agents doesn't make the checks independent. Withholding the right thing from each one does. The lead sees the change spec, `spec:status` and handoffs, never the code: it coordinates and doesn't implement.

The mutator and judge cover each other's blind spot ([intent-testing-landscape.md](intent-testing-landscape.md)). The mutator finds a test that looks right but doesn't catch a break. The judge finds a clause that the code and the test both skip. The mutator sends its "not mutated" list straight to the judge as a starting point.

## 4. Decisions so far

1. **Rows land before the change spec.** The intent holder owns the what. The change spec is written at pickup by whoever delivers, and lands with the first delivery MR.
2. **The spec critic waits.** The workflow starts minimal. Add a critic if delivery keeps tripping over vague rows.
3. **Tests are written apart from the implementation.** A separate test author is the cheapest independence the research found.
4. **The spec mutator and intent judge are separate teammates, and both are required.** Each has one focused job, and together they are what gives a person confidence at review.
5. **Anyone can flag a wrong row.** It changes only through a rows MR.
6. **The intent holder may review delivery MRs, but doesn't have to.** The merged rows are the contract.

## 5. Checked against the goals

| Part | Serves |
| --- | --- |
| Rows land first, owned by the intent holder | Clarity and alignment |
| A lead running slices in parallel | Pace |
| A separate test author | Confidence at review |
| Spec mutator, intent judge and agent reviewer | Confidence at review, and pace, since a person reads less |
| Keeping what the change taught | Clarity and alignment, over time |

Possible signals, once it runs:

- **Pace:** time from rows merged to rows delivered.
- **Clarity and alignment:** how often a row changes after its rows MR.
- **Confidence at review:** human review time per MR, and bugs found after merge that the mutator and judge missed.

## 6. Not yet

- **The spec critic.** An agent that challenges vague or multi-decision rows before they land, seeing only the intent and the rows. Deferred; see decision 2.
- **Changes that span repositories.** The model holds: each repo owns its rows, and journey rows own behaviour that crosses repos. The strains are agreeing the whole intent across several rows MRs, ordering and status across repos, and agent teams loading only the lead's project context. These wait until the three goals are proven on one repo.
- **Signals.** None are measured yet.

## Open questions

- [SPEC-DRIVEN-DEVELOPMENT.md §4](../../SPEC-DRIVEN-DEVELOPMENT.md) has MR 1 landing the rows and the change spec together. Decision 1 splits them, so §4 and the [change template](../../changes/TEMPLATE.md) change if this is adopted.
- Of the agents above, only the spec mutator exists here ([spec-mutator](../../.claude/agents/spec-mutator/spec-mutator.md)). The test-file lock hook doesn't exist yet.
