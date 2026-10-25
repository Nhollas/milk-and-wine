# Can a test suite be checked against its intent?

Research notes, 25 October 2026. The question: are there tools that check tests against the natural-language intent they came from, in the way Stryker checks them against the code? This builds on [ai-test-faithfulness.md](ai-test-faithfulness.md) and doesn't repeat it. Read that for executable specs, row-scoped Stryker, ACH and LLM judges in depth.

## Short answer

- **No tool does the whole job.** It splits into three checks. Each check has partial tools. Nothing joins them up, and nothing found targets TypeScript or Vitest.
- **This repo already has two of the three.** `spec:check` traces rows to tests. `spec-mutator` with `pnpm spec:mutants` mutates from the row. The missing one is alignment: does the test check what its row says?
- **"Mutate the intent" is a named research line now.** It covers intent-based mutation, round-trip mutation and property-based mutation. It's all academic, and none of it is released as a tool.
- **The metric has a name too.** A _requirement-killed_ mutant counts only if the requirement's own test kills it. RESTestBench calls the resulting score MS_ϕ. That's the "intent kill score" you were after.

## The three checks

| Check | Question it answers | Best that exists | In this repo |
| --- | --- | --- | --- |
| 1. Trace | Does every part of the intent have a test, and every test an intent? | Explicit links: Tessl `[@test]`, Kiro, Xray-style matrices. LLM link recovery when no links exist | `spec:check`, by row ID. Not per clause |
| 2. Align | Does the test check what its intent says? | LLM judges, and research on test names that don't match their bodies. Evidence is weak | `intent-judge`, advisory. See the [judge trial](judge-trial/README.md) |
| 3. Mutate intent | Does the suite notice when code drifts from the intent? | ACH, intent-based mutation, round-trip mutation, property-based mutation | `spec-mutator` and `pnpm spec:mutants` |

They depend on each other. Check 1 lists what must be covered. Check 3 is the gate, because its verdict comes from running tests. Check 2 covers check 3's blind spot.

### The blind spot

Mutation needs code to break. If a clause is missing from both the code and the test, there is nothing to mutate, and check 3 passes. The [B3 trial](b3-trial/README.md) hit this. Only something that reads the intent and the test side by side can find it, which is check 2.

`spec-mutator` already records where to look. Its `"not mutated"` list names the parts of a Then it couldn't break. Each entry is either fine (proven elsewhere, as with a `dependency` row) or a missing clause. Check 2 should start there.

## New since ai-test-faithfulness.md

### 1. Round-trip mutation testing

An LLM reads the code and writes down what it thinks the code is for. A second step generates code from that description, and any version that behaves differently from the original becomes a mutant. Before the second step, the description can also be changed slightly, which mimics a developer who misread the spec. No written intent is needed.

Across 40 real buggy methods, it found over 4 times more faults than pattern-based mutation when choosing 4 tests, and 1.7 times more when choosing 30. No tool has been released. ([Hamidi et al. 2026](https://arxiv.org/abs/2607.03223))

**Here:** this is the fallback for code with no row. With a row, `spec-mutator` already starts from the real intent, which is better.

### 2. Requirement-killed mutants (property-based mutation)

Property-based mutation testing judges a suite against one requirement at a time. A mutant counts only if it can break that requirement, and it is killed only when a test violates that requirement ([Bartocci et al. ICST 2023](https://arxiv.org/abs/2301.13615)).

RESTestBench applies this to tests generated from natural-language requirements. Each requirement gets its own mutants, and only that requirement's test can kill them. The score is MS_ϕ, the requirement-killed mutants divided by all mutants. On precise requirements, scores ranged from 13% to 92% depending on the model. On vague requirements, they fell by 26 to 40 points. The benchmark is public. ([RESTestBench 2026](https://arxiv.org/html/2604.25862))

**Here:** this is what `pnpm spec:mutants` already does per row. The new parts are the name, a published metric, and evidence that vague rows produce weaker tests.

### 3. LLM traceability link recovery

These tools find links between requirements and tests when nobody wrote the links down:

- **REST-at** links requirements to manual system tests. Open-weight models matched GPT-4, and results depended heavily on the prompt ([Chalmers 2026](https://research.chalmers.se/publication/554150)).
- **TraceLLM** beat retrieval and fine-tuned baselines on four benchmarks that include test cases ([arXiv 2602.01253](https://arxiv.org/abs/2602.01253)).
- **LiSSA** does general link recovery with retrieval-augmented generation ([ICSE 2025](https://conf.researchr.org/details/icse-2025/icse-2025-research-track/192/LiSSA-Toward-Generic-Traceability-Link-Recovery-through-Retrieval-Augmented-Generati)).

They all answer "which test relates to which requirement". None of them asks whether the test checks the requirement.

**Here:** not needed, since row IDs in test titles are exact. It could matter for clause-level tracing: which assertion covers which part of a Then.

### 4. LLM judges of acceptance tests

LAJ scores Gherkin tests with a rubric and returns structured JSON. Across 20 model setups and 100 expert-annotated scripts, GPT-4o Mini was the most accurate and among the cheapest ([arXiv 2512.01232](https://arxiv.org/abs/2512.01232)). The abstract reports error against expert scores, not agreement with people, and doesn't say whether the judge compared tests with acceptance criteria.

The underlying problem is common. In one study of 213,423 test names, only about 9% fully described what the test did ([arXiv 2005.05359](https://arxiv.org/abs/2005.05359)).

**Here:** this supports check 2 as advisory triage. It still isn't a gate.

### 5. LLM mutation tools for code

These write more realistic mutants than Stryker's operators, but they start from the code, not from an intent:

- **LLMorpheus** asks an LLM to fill in placeholders in JavaScript, then applies its mutants through a modified StrykerJS ([Tip et al.](https://arxiv.org/abs/2404.09952)).
- **Mutahunter** is open source (AGPL), works across languages, reads lcov and similar coverage reports, and uses OpenAI models ([GitHub](https://github.com/codeintegrity-ai/mutahunter)).

ACH is still the only industrial system that takes a plain-text concern. It hasn't been released ([Foster et al. 2025](https://arxiv.org/abs/2501.12862)).

## Gaps nobody fills

1. **Tracing by clause.** Every tool links a whole requirement to a whole test. None maps parts of a Then to assertions.
2. **A validated judge for check 2.** No study measures an LLM judge on whether a test covers every clause of its requirement.
3. **Whether intent mutants are relevant.** People judge this by hand. ACH engineers rated 36% of its tests relevant to the concern.
4. **One report for all three checks.** Nobody combines trace status, requirement-killed score and alignment findings per requirement.
5. **TypeScript.** Every intent-mutation result above is academic, and none ships for TypeScript or Vitest.

## What this means for the next step

The repo is ahead of the published tooling on checks 1 and 3. The obvious next piece is check 2, scoped tightly:

- **Input:** one row, its test, and `spec-mutator`'s `"not mutated"` list for that row.
- **Output:** each part of the Then mapped to the assertion lines that check it, or marked `missing`.
- **Trust:** advisory only, until its recall has been measured by deleting assertions from tests known to be good.

## Sources

- Bartocci, Mariani, Ničković & Yadav, [Property-Based Mutation Testing](https://arxiv.org/abs/2301.13615), ICST 2023
- Foster et al., [Mutation-Guided LLM-based Test Generation at Meta](https://arxiv.org/abs/2501.12862), FSE 2025
- Hamidi, Khanfir & Papadakis, [Intent-Based Mutation Testing](https://arxiv.org/abs/2607.05149), ICSTW 2025
- Hamidi, Richter, Khanfir & Papadakis, [Round-Trip Mutation Testing](https://arxiv.org/abs/2607.03223), 2026
- [A Pattern-based Approach to Detect and Improve Non-descriptive Test Names](https://arxiv.org/abs/2005.05359), 2020
- [LLM-as-a-Judge for Scalable Test Coverage Evaluation](https://arxiv.org/abs/2512.01232), 2025
- [LiSSA: Toward Generic Traceability Link Recovery through RAG](https://conf.researchr.org/details/icse-2025/icse-2025-research-track/192/LiSSA-Toward-Generic-Traceability-Link-Recovery-through-Retrieval-Augmented-Generati), ICSE 2025
- Mutahunter, [README](https://github.com/codeintegrity-ai/mutahunter)
- [REST-at: An LLM-Based Tool for Automating Traceability between Requirements and Test Cases](https://research.chalmers.se/publication/554150), 2026
- [RESTestBench](https://arxiv.org/html/2604.25862), 2026
- Tessl, [Spec-Driven Development with Tessl](https://docs.tessl.io/use/spec-driven-development-with-tessl)
- Tip, Bell & Schäfer, [LLMorpheus](https://arxiv.org/abs/2404.09952)
- [TraceLLM](https://arxiv.org/abs/2602.01253), 2026
