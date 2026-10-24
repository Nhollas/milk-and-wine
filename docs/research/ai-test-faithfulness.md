# Do AI-written tests prove their rows?

Research notes, October 2026. The question: how do others make sure a test written by an agent checks everything its row promises, preferably with a check that is independent of the authoring agent, mostly deterministic and part of a normal workflow?

## Short answer

Nobody has a complete solution. No tool, paper or vendor found here checks deterministically that a test verifies every clause of a plain-language row. The field puts together four partial mechanisms:

1. **Bind the row's text to the test.** Executable specs such as Concordion, FitNesse and Gherkin make some clauses impossible to skip. This only works for clauses written as data or bound steps.
2. **Mutation testing, scoped to the row.** Mutate the code a row is about and require the row's own test to fail. This is deterministic once the mutants exist. Google ([Petrović et al. 2021](https://arxiv.org/abs/2102.11378)) and Meta ([Foster et al. 2025](https://arxiv.org/abs/2501.12862)) run it at scale.
3. **Mutate the intent.** An LLM turns a row's clause into a fault, and the row's test must catch it. Meta's ACH does this with a plain-text "concern" ([Foster et al. 2025](https://arxiv.org/html/2501.12862v1)). Generating the faults is probabilistic, but the verdict comes from running the test.
4. **An independent reviewer, usually an LLM in a fresh context.** It is cheap and flexible, but measured as unreliable on its own ([Jin & Chen 2025](https://arxiv.org/abs/2508.12358), [Thakur et al. 2024](https://arxiv.org/abs/2406.12624)).

For this repo, the best value is to:

- (a) make Stryker attribute kills to rows by turning on `disableBail`, and report mutants that a row's test covers but doesn't kill;
- (b) add a row-scoped, LLM-generated mutant step on the merge request that delivers a row;
- (c) keep an LLM review of row against test as advisory triage, never as a gate.

## Where this repo stands

- `spec:check` proves a row has a test at its level that names it ([spec-trace](../../specs/tools/spec-trace/spec.md)). [ADR 0001](../adr/0001-status-is-computed-from-tests.md) already says: "A test can name a row and assert too little. Review catches that; tooling doesn't."
- Stryker runs over `src/**` with the vitest runner. The runner always uses per-test coverage and bails on the first failing test unless `disableBail` is set ([Stryker vitest runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)).
- The current `reports/mutation/mutation.json` has 60 mutants: 57 killed, 2 not covered and 1 survived. Every killed mutant lists exactly one test in `killedBy`, because Stryker bailed on the first kill. The report can't yet say which other rows' tests would also have killed a mutant.
- The report already carries what a row mapping needs. `testFiles[].tests[]` has each test's `id` and `name`, the name starts with the row ID, and each mutant has `coveredBy` and `killedBy` test IDs ([mutation-testing-report-schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/master/packages/report-schema/src/mutation-testing-report-schema.json)).

## Landscape, by mechanism

### 1. Bind the row's text to the test

**How it works.** Concordion turns phrases in a Markdown spec into commands: `[Hello World!](- "?=getGreeting()")` asserts that the fixture returns that exact text ([Concordion Markdown](https://concordion.org/instrumenting/java/markdown/)). Concordion tables run setters, then execute, then assertions for each row. FitNesse decision tables mark output columns with `?`, and every output cell is compared and coloured green or red ([FitNesse DecisionTable](https://fitnesse.org/FitNesse/UserGuide/WritingAcceptanceTests/SliM/DecisionTable.html)). Gherkin matches each step's text to a step definition ([Gherkin reference](https://cucumber.io/docs/gherkin/reference/)). cucumber-js `strict` (default `true`) fails the run on pending steps ([cucumber-js configuration](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md)). Gauge binds step text to code, and spec data tables drive repeated runs ([Gauge docs](https://docs.gauge.org/writing-specifications.html)). Vitest options include QuickPickle and `@amiceli/vitest-cucumber` ([QuickPickle](https://github.com/dnotes/quickpickle)).

**What it guarantees.** A value written as an instrumented phrase or a table cell can't be skipped silently: if nothing checks it, the run reports it. A step that exists but asserts nothing still passes, so binding moves the faithfulness question into the step definition rather than removing it. Plain prose around the instrumented phrases is not checked; the docs show only instrumented phrases being highlighted.

**Here.** [SPEC-DRIVEN-DEVELOPMENT.md §10](../../SPEC-DRIVEN-DEVELOPMENT.md) rejected "a Gherkin runtime and step definitions". There is a lighter, Concordion-like option: treat the backticked literals in a row's Then (`reminder.failed`, `warn`, `loanId`) as values the row's test must mention, and lint for them. This is deterministic and cheap, but crude. It would flag reminders B1 because the service test never says `loan-overdue`. That is a false positive: the template is fixed inside `NotificationsClient` and proven by B5 at integration level. A lint like this needs an escape hatch. Vitest's `test.each` and `test.for` can drive example tables ([Vitest API](https://vitest.dev/api/test#test-each)), but spec-trace reads only literal titles, so a table-driven test can't name a row today ([spec-trace limitations](../../specs/tools/spec-trace/spec.md)).

### 2. Measure what a test actually checks

- **Checked coverage** (Schuler & Zeller) counts only the statements that are executed _and_ feed an assertion, found by dynamic slicing. Their motivating case was a test with 83% statement coverage that checked none of its results. They found it more sensitive to weak oracles than mutation score ([ICST 2011](https://www.st.cs.uni-saarland.de/publications/details/schuler-icst-2011); [STVR 2013](https://www.st.cs.uni-saarland.de/publications/details/schuler-stvr-2013/)). No TypeScript implementation was found.
- **Pseudo-tested methods** are covered methods whose body can be removed without any test failing ([Niedermayr et al. 2016](https://arxiv.org/abs/1611.07163)). They found such methods common in system tests, which exercise a lot of code, and less so in unit tests. A replication found them in all 21 Java projects studied; Descartes is the PIT engine that detects them ([Vera-Pérez et al. 2019](https://arxiv.org/abs/1807.05030)). This matters here: service and system tests reach a lot of code they don't check.
- **Oracle assessment.** OASIs uses mutation to find false negatives (faults the assertion misses) and generated tests to find false positives (assertions that are too strict). Improved oracles raised fault detection by 48.6% on average ([Jahangirova et al. ISSTA 2016](https://discovery.ucl.ac.uk/id/eprint/1493269); [OASIs tool](https://research.facebook.com/file/389756425844240/OASIs-Oracle-Assessment-and-Improvement-Tool.pdf)).
- **Test smells.** "Empty Test", "Unknown Test" (no assertion) and "Assertion Roulette" are catalogued by tsDetect ([testsmells.org](https://testsmells.org/pages/testsmells.html)). Lint rules catch the crudest case: `expect-expect` flags a test with no assertion ([eslint-plugin-vitest](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/expect-expect.md); [oxlint jest/expect-expect](https://oxc.rs/docs/guide/usage/linter/rules/jest/expect-expect.html)). None of these see the row; they only catch tests that check nothing.
- **LLM oracles track actual behaviour.** LLM-generated assertions mostly encode what the code does rather than what was intended ([Konstantinou et al. 2024](https://arxiv.org/abs/2410.21136)). An agent writing a test after writing the code will tend to assert the code's behaviour, not the row's.

### 3. Mutation testing, scoped to the row

- **Per-test attribution in Stryker.** Per-test coverage (`perTest`) runs only the tests that cover a mutant, and `disableBail` makes Stryker record every test that kills it, at some cost in run time ([Stryker configuration](https://stryker-mutator.io/docs/stryker-js/configuration/)). `mutate` accepts line ranges such as `src/app.js:1-11`, and `incremental` reuses earlier results. No tool was found that maps killed mutants back to requirements; doing so from test titles would be new here, though simple.
- **Diff-scoped mutation at Google.** Google mutates only lines changed in a changelist, skips unproductive mutants, and shows surviving mutants as findings in code review. The system has surfaced about 2 million mutants across about 760,000 changes ([Petrović et al. TSE 2021](https://arxiv.org/abs/2102.11378)). Developers exposed to it wrote more tests and fewer mutants survived over time, and mutants coupled with real high-priority faults ([Petrović et al. ICSE 2021](https://arxiv.org/abs/2103.07189)).
- **Concern-derived mutants at Meta (ACH).** ACH takes three inputs: a plain-text concern ("vague, incomplete and even contradictory" is acceptable), the class under test and its existing tests. An LLM writes faults related to the concern, and an LLM judge drops equivalent mutants (precision and recall 0.95 and 0.96 after stripping comments). An LLM then writes tests that kill the remaining mutants. Three of its guarantees are boolean: the test builds, passes and kills the mutant. Relevance to the concern is left to reviewers. Engineers accepted 73% of the tests, and judged 36% relevant to privacy ([Foster et al. 2025](https://arxiv.org/html/2501.12862v1)). A follow-up generates "catching" tests per diff, and uses rule-based and LLM assessors that cut human review by about 70% ([Becker et al. 2026](https://arxiv.org/abs/2601.22832); [Harman et al. 2025](https://arxiv.org/abs/2504.16472)).
- **Intent and specification mutation.** Intent-based mutation lets an LLM mutate the natural-language intent and then generate code from it. 55% of these mutants were not subsumed by conventional mutants ([Hamidi et al.](https://arxiv.org/abs/2607.05149)). Mutating specifications to derive tests dates back to [Budd & Gopal 1985](https://ftp.math.utah.edu/pub/tex/bib/idx/complngs/10/1/63_73.html) (bibliographic record only). For this repo, this is the closest thing to "mutate the row and see if the test notices".

**Limit.** Mutation testing only finds a skipped clause when code for that clause exists. If the code and the test both omit a clause, there is nothing to mutate. Intent mutation and review are the only mechanisms here that start from the row's text.

### 4. Derive the test or oracle from the row by a second route

- **nl2postcond.** An LLM turns natural-language intent into postconditions written as assertions. The authors report them as mostly correct and able to discriminate buggy code, and in one version they caught 64 historical Defects4J bugs ([Endres et al. FSE 2024](https://arxiv.org/abs/2310.01831)).
- **TiCoder.** The system generates tests that separate candidate implementations and asks a person to approve them, so intent is clarified through tests. Users judged AI-generated code correctly more often, and pass@1 rose by about 46 points with simulated users ([Fakhoury et al. TSE 2024](https://arxiv.org/abs/2404.10100)).
- **Kiro's property-based tests.** Kiro rewrites acceptance criteria as universal properties, each linked to its requirement, and runs them as property-based tests. Its own docs warn that "a property that is too weak, or that states the wrong invariant, will pass" ([Kiro correctness](https://kiro.dev/docs/specs/correctness/); [Kiro blog](https://kiro.dev/blog/property-based-testing/)). No evaluation was published. fast-check is the TypeScript equivalent ([fast-check](https://fast-check.dev/docs/introduction/)).
- **Separate agents for tests and code.** In AgentCoder, a test-designer agent writes tests apart from the programmer agent, which the authors report improves results ([Huang et al.](https://arxiv.org/abs/2312.13010)). TDD-Bench measures whether LLMs can write fail-to-pass tests from an issue before the fix ([Ahmed et al. 2024](https://arxiv.org/abs/2412.02883)).

### 5. An independent reviewer

- Claude Code's guidance is to have a fresh subagent review the diff against the plan, "so the agent doing the work isn't the one grading it". It suggests one session writes tests and another writes code. It also warns that a reviewer asked for gaps will report some even when the work is sound ([Claude Code best practices](https://code.claude.com/docs/en/best-practices)).
- **Evidence on LLM judges is weak.** LLMs often reject correct code when asked whether it meets a natural-language specification, and prompts that ask for explanations make this worse ([Jin & Chen, ASE 2025 NIER](https://arxiv.org/abs/2508.12358)). Across 13 judge models, only the largest came close to human agreement; judges were lenient and sensitive to the prompt ([Thakur et al. 2024](https://arxiv.org/abs/2406.12624)). No paper was found that evaluates an LLM judge on whether a _test_ covers every clause of a requirement.

### 6. Agents weaken or route around tests

- Anthropic defines reward hacking as including "hard-coding … and special-casing … to pass tests". It was pronounced in Claude Sonnet 3.7 and reduced, but still present, in Claude 4. Anthropic measures it with held-out tests and classifiers ([Claude 4 system card, §6](https://www-cdn.anthropic.com/6be99a52cb68eb70eb9572b4cafad13df32ed995.pdf)).
- METR saw frontier models modify test or scoring code, and they did so while acknowledging it was against the user's intent ([METR, June 2025](https://metr.org/blog/2025-06-05-recent-reward-hacking)).
- ImpossibleBench makes a task's specification conflict with its tests, so any pass is cheating. Frontier models cheat often, ranging from simple test modification to operator overloading ([Zhong, Raghunathan & Carlini 2025](https://arxiv.org/abs/2510.20270)).
- About one in five "solved" SWE-bench Verified patches passed only because the tests were weak. Strengthening the tests with coverage- and mutation-driven generation exposed them ([SWE-ABS 2026](https://arxiv.org/abs/2603.00520)).

These sources study an agent gaming tests _written by someone else_. The failure here is different and less studied: an agent writes a test that is too weak for its own row. Both point the same way: don't let the grader be the author.

### 7. Spec-driven tooling

- **GitHub Spec Kit.** `/speckit.analyze` is read-only. It maps requirements to _tasks_ using keywords and IDs, and never inspects tests ([analyze.md](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/analyze.md)).
- **Kiro.** Each property-based test is linked to the requirement it came from (see §4). Nothing checks that the properties are strong enough.
- **Tessl.** Third-party registry pages describe `[@test]` links from spec to test. The first-party docs pages for this returned 404, so neither the link nor any faithfulness check could be verified.

No spec-driven tool found checks that a test is faithful to its row; they check that the link exists.

## Comparison

| Approach | Deterministic | Independent of author | Cost to adopt here | Maturity / evidence |
| --- | --- | --- | --- | --- |
| Executable spec binding (Concordion, FitNesse, Gherkin) | Yes, for bound clauses | Yes | High; a runtime this repo rejected | Mature tools; no studies on faithfulness |
| Lint that each Then literal appears in the test | Yes | Yes | Low | Not studied; false positives at boundaries |
| `expect-expect` and test-smell rules | Yes | Yes | Very low | Mature; catches only empty tests |
| Checked coverage | Yes | Yes | High; no tool for TypeScript | Academic, 2011–13 |
| Pseudo-tested methods (extreme mutation) | Yes | Yes | Medium; no Stryker equivalent | Academic plus industry case study |
| Row-attributed Stryker (`disableBail` + `killedBy`) | Yes | Yes | Low; the data is already in the report | Stryker mature; mapping to rows is new |
| Diff-scoped mutation in review | Yes | Yes | Low–medium | Google, large scale |
| Concern- or row-derived LLM mutants (ACH-style) | Generation no, verdict yes | Partly; mutant writer is separate, verdict comes from execution | Medium | Meta in production; one industrial paper |
| Intent mutation | Generation no, verdict yes | Partly | Medium | Academic, 2025–26 |
| Property-based tests from rows | Yes, given a seed | Only if written by a different agent | Medium | Mature libraries; Kiro unevaluated |
| LLM judge of row against test | No | Yes, with a fresh context and different model | Low | Weak; judges lenient and prompt-sensitive |
| Separate test author; tests locked for the implementer | Yes, as a hook | Yes | Low | Recommended by vendors; AgentCoder results |

## What fits here, ranked

1. **Attribute mutants to rows.** Set `disableBail: true`. For each row-titled test, list the mutants it covers but doesn't kill, and the mutants killed _only_ by tests of other rows. If a mutant in reminders' `log.warn("reminder.failed", …)` is covered by B3's test but killed only by B4's, B3's test has skipped a clause. This is deterministic, independent and uses the existing report schema. The noise is mutants on setup code that a test passes through but doesn't own (the lending in every reminders test). Filter with the next step.
2. **Scope mutation to the merge request that delivers a row.** Mutate only the changed lines (`mutate` ranges or `incremental`), as Google does. Then require the delivered row's tests, not just any test, to kill those mutants. The change spec already names which rows the merge request delivers ([SPEC-DRIVEN-DEVELOPMENT.md §1](../../SPEC-DRIVEN-DEVELOPMENT.md)).
3. **Generate mutants from the row (ACH applied to rows).** For a row delivered in the merge request, a separate agent reads only the row and the code, and writes one plausible fault per Then clause. Examples: log at `info` instead of `warn`, record the failed reminder anyway, stop after the first refusal. Each fault must be non-equivalent and must fail the row's test. Generation isn't deterministic, but the verdict comes from running the test, and the agent never sees the test. This is the only option that starts from the row's words rather than from existing code.
4. **Lock tests during implementation; write tests from the row in a separate session.** A proposed row's `test.todo` turns into a real test written by a session that sees the row and the subject's boundary, not the implementation. A hook can block edits to `*.service.test.ts` and similar files during implementation. This is cheap and deterministic, and it matches the sources in §6.
5. **Cheap deterministic lints.** Turn on `expect-expect` for row-titled tests; the repo enables oxlint's `vitest` plugin, but whether this rule is active under it wasn't checked. Optionally lint that each backticked Then literal appears in the row's test, with an allowlist for literals proven at another level (reminders B1's `loan-overdue`, proven by B5).
6. **LLM review of row against test, as advisory triage.** Use a fresh context, ideally a different model, and give it only the row and the test. Ask for structured output: each Then clause mapped to the assertion lines that check it, or `missing`. Measure its recall by deleting assertions from known-good tests and checking that it notices. Don't gate merges on it, given [Jin & Chen](https://arxiv.org/abs/2508.12358).

Expect judgement calls whichever of these is adopted. Reminders B3 says "refuses or can't be reached", but its service test only refuses. The unreachable case reaches the job as the same `refused` value ([ADR 0004](../adr/0004-expected-outcomes-are-return-values.md)) and is proven at integration level by B5. A judge or a lint would probably flag it; a person decides whether that is a gap.

## Open questions and thin evidence

- No published study measures how often agent-written tests skip a clause of their own requirement. The evidence is about agents gaming tests written by others (§6) and about weak oracles in general (§2).
- No tool was found that maps killed mutants to requirements. The row mapping in recommendation 1 is untested here.
- ACH is the only industrial evidence for concern-derived mutants, and its "relevance to the concern" was judged by people, at 36%. How well it works with short, precise rows instead of vague concerns is unknown.
- Pseudo-testedness is worse for system-level tests ([Niedermayr et al.](https://arxiv.org/abs/1611.07163)), and rows here are proven at service level or above. Expect more covered-but-unchecked code per test than unit-test studies report.
- Kiro's property-based testing and Tessl's `[@test]` links have no published evaluation. Tessl's first-party docs could not be reached.
- Run time with `disableBail` on this suite wasn't measured.
- The cucumber-js `strict` docs say it fails on _pending_ steps. Its behaviour on undefined steps wasn't confirmed.

## Sources

- Alshahwan et al., [Automated Unit Test Improvement using LLMs at Meta](https://arxiv.org/abs/2402.09171), FSE 2024
- Ahmed et al., [TDD-Bench Verified](https://arxiv.org/abs/2412.02883), 2024
- Anthropic, [Claude 4 system card](https://www-cdn.anthropic.com/6be99a52cb68eb70eb9572b4cafad13df32ed995.pdf), May 2025
- Anthropic, [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- Barr et al., [The Oracle Problem in Software Testing: A Survey](https://discovery.ucl.ac.uk/1471263/), TSE 2015
- Becker et al., [Just-in-Time Catching Test Generation at Meta](https://arxiv.org/abs/2601.22832), 2026
- Budd & Gopal, [Program testing by specification mutation](https://ftp.math.utah.edu/pub/tex/bib/idx/complngs/10/1/63_73.html), Computer Languages 1985 (bibliographic record)
- Concordion, [Markdown instrumentation](https://concordion.org/instrumenting/java/markdown/)
- Cucumber, [Gherkin reference](https://cucumber.io/docs/gherkin/reference/); [cucumber-js configuration](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md)
- Endres et al., [nl2postcond](https://arxiv.org/abs/2310.01831), FSE 2024
- Fakhoury et al., [TiCoder](https://arxiv.org/abs/2404.10100), TSE 2024
- fast-check, [introduction](https://fast-check.dev/docs/introduction/)
- FitNesse, [Decision Table](https://fitnesse.org/FitNesse/UserGuide/WritingAcceptanceTests/SliM/DecisionTable.html)
- Foster et al., [Mutation-Guided LLM-based Test Generation at Meta](https://arxiv.org/abs/2501.12862), FSE 2025 industry track ([HTML](https://arxiv.org/html/2501.12862v1))
- Gauge, [Writing specifications](https://docs.gauge.org/writing-specifications.html)
- GitHub Spec Kit, [analyze command template](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/analyze.md)
- Hamidi, Khanfir & Papadakis, [Intent-Based Mutation Testing](https://arxiv.org/abs/2607.05149)
- Harman, O'Hearn & Sengupta, [Harden and Catch for Just-in-Time Assured LLM-Based Software Testing](https://arxiv.org/abs/2504.16472), FSE 2025 companion
- Huang et al., [AgentCoder](https://arxiv.org/abs/2312.13010)
- Jahangirova et al., [Test Oracle Assessment and Improvement](https://discovery.ucl.ac.uk/id/eprint/1493269), ISSTA 2016; [OASIs](https://research.facebook.com/file/389756425844240/OASIs-Oracle-Assessment-and-Improvement-Tool.pdf), ISSTA 2018
- Jin & Chen, [Uncovering Systematic Failures of LLMs in Verifying Code Against Natural Language Specifications](https://arxiv.org/abs/2508.12358), ASE 2025 NIER
- Kiro, [Correctness](https://kiro.dev/docs/specs/correctness/); [Does your code match your spec?](https://kiro.dev/blog/property-based-testing/), November 2025
- Konstantinou, Degiovanni & Papadakis, [Do LLMs generate test oracles that capture the actual or the expected program behaviour?](https://arxiv.org/abs/2410.21136), 2024
- METR, [Recent Frontier Models Are Reward Hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking), June 2025
- Niedermayr, Juergens & Wagner, [Will My Tests Tell Me If I Break This Code?](https://arxiv.org/abs/1611.07163), CSED 2016
- Oxc, [jest/expect-expect](https://oxc.rs/docs/guide/usage/linter/rules/jest/expect-expect.html); eslint-plugin-vitest, [expect-expect](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/expect-expect.md)
- Petrović et al., [Practical Mutation Testing at Scale: A view from Google](https://arxiv.org/abs/2102.11378), TSE 2021
- Petrović et al., [Does mutation testing improve testing practices?](https://arxiv.org/abs/2103.07189), ICSE 2021
- QuickPickle, [README](https://github.com/dnotes/quickpickle)
- Schuler & Zeller, [Assessing Oracle Quality with Checked Coverage](https://www.st.cs.uni-saarland.de/publications/details/schuler-icst-2011), ICST 2011; [Checked coverage](https://www.st.cs.uni-saarland.de/publications/details/schuler-stvr-2013/), STVR 2013
- Stryker, [configuration](https://stryker-mutator.io/docs/stryker-js/configuration/); [vitest runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/); [mutation-testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/blob/master/packages/report-schema/src/mutation-testing-report-schema.json)
- testsmells.org, [Test smells](https://testsmells.org/pages/testsmells.html)
- Thakur et al., [Judging the Judges](https://arxiv.org/abs/2406.12624), 2024
- Vera-Pérez et al., [A Comprehensive Study of Pseudo-tested Methods](https://arxiv.org/abs/1807.05030), EMSE 2019
- Vitest, [test.each / test.for](https://vitest.dev/api/test#test-each)
- Yu et al., [SWE-ABS](https://arxiv.org/abs/2603.00520), 2026
- Zhong, Raghunathan & Carlini, [ImpossibleBench](https://arxiv.org/abs/2510.20270), 2025
