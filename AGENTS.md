## Pre-launch

- Nothing is released and nobody uses this yet. Make breaking changes outright: rename, remove and reshape in place, with no migrations, shims or backwards-compatible paths.
- Nothing here is settled. The specs, the tooling and the code are experiments, open to challenge, including the parts that already work. Don't treat what exists as fact or hold back from changing it. A question about them is a question, not a decision.

## Branches and PRs

- A spec change and each ticket land as their own PR, on their own branch, as [the workflow](docs/workflow.md) describes. A ticket's PR closes its sub-issue.
- Commit anything else straight to `main`. Don't create a branch for it unless you're asked to.

## Specs

- Behaviour is specified in `specs/**/spec.md`. A scenario may be proposed: specced, not built. It is delivered only once an active test of the kind its Verified names has its ID in the title, so check for that test before relying on a scenario.
- A test whose title starts with a scenario ID (`"B2: …"`) proves that scenario. If your change alters what such a test checks, or code and a scenario disagree, say so; don't quietly edit either to match.

## Before you

- name anything, use the terms in [GLOSSARY.md](GLOSSARY.md).
- write code or tests, read [CODING-STANDARDS.md](CODING-STANDARDS.md).
- change the process, read [INTENT.md](INTENT.md).
- hand work back, run `pnpm check`.
