# Checking tests against their intent

Research notes, October 2026. The question: how do others make sure a test checks everything its requirement promises, especially when an agent wrote both the code and the test? This is what the [intent judge](../../.claude/skills/intent-judge/agents/intent-judge.md) and [spec mutants](../../specs/tools/spec-mutants/spec.md) were weighed against.

## Short answer

- **No tool does the whole job.** No tool, paper or vendor found checks deterministically that a test verifies every clause of a plain-language requirement. Nothing found targets TypeScript or Vitest.
- **It splits into three checks:**
  1. **Trace.** Does every requirement have a test?
  2. **Align.** Does the test check what its requirement says?
  3. **Mutate the intent.** Does a test fail when the code drifts from the requirement?
- **Each check has partial tools. Nothing joins them up.**
- **Mutation has a blind spot.** If the code and the test both leave a clause out, there is nothing to mutate. Only something that reads the intent next to the test, such as a judge, can find that.
- **LLM judges are weak on their own.** Use them for advisory triage, not as a gate.

| Check | Question | Best that exists | Here |
| --- | --- | --- | --- |
| Trace | Does every requirement have a test? | Explicit links (Tessl `[@test]`, Kiro); LLM link recovery | Scenario IDs in test titles |
| Align | Does the test check what its requirement says? | LLM judges. Evidence is weak | Intent judge |
| Mutate intent | Does a test fail when the code drifts from it? | Meta's ACH; intent-based, round-trip and property-based mutation | Spec mutants |

## Bind the requirement's text to the test

- **Executable specs.**
  - Concordion turns phrases in a Markdown spec into assertions ([Concordion](https://concordion.org/instrumenting/java/markdown/)).
  - FitNesse compares every output cell of a decision table ([FitNesse](https://fitnesse.org/FitNesse/UserGuide/WritingAcceptanceTests/SliM/DecisionTable.html)).
  - Gherkin binds step text to step definitions, and cucumber-js `strict` fails the run on pending steps ([Gherkin](https://cucumber.io/docs/gherkin/reference/), [cucumber-js](https://github.com/cucumber/cucumber-js/blob/main/docs/configuration.md)).
- **What binding guarantees.** A bound value can't be skipped silently. A step that asserts nothing still passes, so the faithfulness question moves into the step definition instead of going away. Prose around the bound phrases isn't checked.

## Measure what a test actually checks

- **Checked coverage** counts only the statements that feed an assertion. In the motivating case, a test had 83% statement coverage and checked none of its results. No TypeScript implementation exists ([Schuler & Zeller 2011](https://www.st.cs.uni-saarland.de/publications/details/schuler-icst-2011)).
- **Pseudo-tested methods** are covered methods whose body can be removed without any test failing. They are common in system tests, which reach a lot of code they don't check ([Niedermayr et al. 2016](https://arxiv.org/abs/1611.07163), [Vera-Pérez et al. 2019](https://arxiv.org/abs/1807.05030)).
- **Test-smell lints** such as `expect-expect` catch only tests that check nothing ([testsmells.org](https://testsmells.org/pages/testsmells.html)).
- **LLM-written assertions follow the code.** They mostly encode what the code does, not what was intended ([Konstantinou et al. 2024](https://arxiv.org/abs/2410.21136)). An agent that writes the test after the code tends to assert the code.

## Mutation, scoped to the requirement

- **Diff-scoped mutation at Google.** Google mutates only the lines a change touches and shows surviving mutants in code review. Developers exposed to it wrote more tests ([Petrović et al. 2021](https://arxiv.org/abs/2102.11378), [ICSE 2021](https://arxiv.org/abs/2103.07189)).
- **Concern-derived mutants at Meta (ACH).**
  - How it works: an LLM turns a plain-text concern into faults, then writes tests that kill them. The verdict comes from running the tests.
  - Results: engineers accepted 73% of the tests, but judged only 36% relevant to the concern ([Foster et al. 2025](https://arxiv.org/abs/2501.12862)).
  - ACH is the only industrial evidence for this approach, and it hasn't been released.
- **Requirement-killed mutants.**
  - A mutant counts only if the requirement's own test kills it ([Bartocci et al. 2023](https://arxiv.org/abs/2301.13615)).
  - RESTestBench names the score MS_ϕ. It ranged from 13% to 92% across models, and fell by 26 to 40 points on vague requirements ([RESTestBench 2026](https://arxiv.org/html/2604.25862)).
- **Intent-based and round-trip mutation.**
  - Intent-based mutation has an LLM mutate the intent, then generates code from it. 55% of these mutants weren't subsumed by conventional ones ([Hamidi et al. 2025](https://arxiv.org/abs/2607.05149)).
  - Round-trip mutation has an LLM describe the code, then regenerates the code from that description. It found 1.7 to 4 times more faults than pattern-based mutation ([Hamidi et al. 2026](https://arxiv.org/abs/2607.03223)).
  - Both are academic, with no released tool.
- **Mutation tools that start from code**, such as LLMorpheus and Mutahunter, write more realistic mutants than operator-based ones. They still never see the requirement ([LLMorpheus](https://arxiv.org/abs/2404.09952), [Mutahunter](https://github.com/codeintegrity-ai/mutahunter)).

## Derive the test by a second route

- **nl2postcond** turns natural-language intent into assertions. In one version, they caught 64 historical Defects4J bugs ([Endres et al. 2024](https://arxiv.org/abs/2310.01831)).
- **TiCoder** asks a person to approve tests that tell candidate implementations apart. It raised pass@1 by about 46 points with simulated users ([Fakhoury et al. 2024](https://arxiv.org/abs/2404.10100)).
- **Kiro** turns acceptance criteria into property-based tests. Its own docs warn that a weak property will still pass, and it has published no evaluation ([Kiro](https://kiro.dev/docs/specs/correctness/)).
- **Separate test and code agents**, as in AgentCoder, improve results ([Huang et al.](https://arxiv.org/abs/2312.13010)).

## Independent reviewers and LLM judges

- **Claude Code's guidance.** Have a fresh subagent review the work, "so the agent doing the work isn't the one grading it". It also warns that a reviewer asked for gaps will find some ([best practices](https://code.claude.com/docs/en/best-practices)).
- **LLMs over-reject correct code.** They often reject correct code when checking it against a natural-language spec, and prompts that ask for explanations make it worse ([Jin & Chen 2025](https://arxiv.org/abs/2508.12358)).
- **Judges are lenient and prompt-sensitive.** Across 13 judge models, only the largest came close to human agreement ([Thakur et al. 2024](https://arxiv.org/abs/2406.12624)).
- **LAJ** scores Gherkin tests with a rubric. Its abstract reports error against expert scores, not agreement with people ([arXiv 2512.01232](https://arxiv.org/abs/2512.01232)).
- **No paper evaluates a judge on whether a test covers every clause of its requirement.**

## Agents and weak tests

- **Agents game tests written by others.**
  - Anthropic measures reward hacking such as special-casing tests ([Claude 4 system card](https://www-cdn.anthropic.com/6be99a52cb68eb70eb9572b4cafad13df32ed995.pdf)).
  - METR saw frontier models edit test code ([METR 2025](https://metr.org/blog/2025-06-05-recent-reward-hacking)).
  - ImpossibleBench catches models cheating when the spec and the tests conflict ([Zhong et al. 2025](https://arxiv.org/abs/2510.20270)).
- **Weak tests let wrong patches through.** About one in five "solved" SWE-bench Verified patches passed only because the tests were weak ([SWE-ABS 2026](https://arxiv.org/abs/2603.00520)).
- **The failure that matters here is less studied:** an agent writing a test too weak for its own requirement. Both lines of evidence point the same way: don't let the author be the grader.

## Spec-driven tooling

- **GitHub Spec Kit.** `/speckit.analyze` maps requirements to tasks and never reads tests ([analyze.md](https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/analyze.md)).
- **Kiro.** It links each property to its requirement, but nothing checks that the property is strong enough.
- **Tessl.** Its `[@test]` links couldn't be verified, because its first-party docs returned 404.
- **None of them checks that a test is faithful to its requirement.** They check that the link exists.

## Gaps nobody fills

1. **Tracing by clause.** Every tool links a whole requirement to a whole test.
2. **A validated judge** for whether a test covers every clause.
3. **Evidence on how often** agent-written tests skip a clause of their own requirement.
4. **One report** that combines trace, mutation and alignment per requirement.
