## Pre-launch

- Nothing is released and nobody uses this yet. Make breaking changes outright: rename, remove and reshape in place, with no migrations, shims or backwards-compatible paths.

## Specs

- Behaviour is specified in `specs/**/spec.md`. A row may be proposed: specced, not built. Check with `pnpm spec:status <subject>` before relying on one.
- A test whose title starts with a row ID (`"B2: …"`) proves that row. If your change alters what such a test checks, or code and a row disagree, say so; don't quietly edit either to match.

## Before you

- write or deliver spec rows, read [SPEC-DRIVEN-DEVELOPMENT.md](SPEC-DRIVEN-DEVELOPMENT.md).
- name anything, use the terms in [GLOSSARY.md](GLOSSARY.md).
- write code or tests, read [CODING-STANDARDS.md](CODING-STANDARDS.md).
- change the process, read [INTENT.md](INTENT.md).
- hand work back, run `pnpm check`.
