## Pre-launch

- Nothing is released and nobody uses this yet. Make breaking changes outright: rename, remove and reshape in place, with no migrations, shims or backwards-compatible paths.
- Nothing here is settled. The specs, the tooling and the code are experiments, open to challenge, including the parts that already work. Don't treat what exists as fact or hold back from changing it. A question about them is a question, not a decision.

## Specs

- Behaviour is specified in `specs/**/spec.md`. A row may be proposed: specced, not built. It is delivered only once an active test at its Verified level names it, so check for that test before relying on a row.
- A test whose title starts with a row ID (`"B2: …"`) proves that row. If your change alters what such a test checks, or code and a row disagree, say so; don't quietly edit either to match.

## Before you

- name anything, use the terms in [GLOSSARY.md](GLOSSARY.md).
- add a term to the glossary: don't. A tool's or a test's names aren't terms. If a spec row or a conversation needs a word the glossary lacks, propose it when you hand work back, and a person adds it.
- write code or tests, read [CODING-STANDARDS.md](CODING-STANDARDS.md).
- change the process, read [INTENT.md](INTENT.md).
- hand work back, run `pnpm check`.
