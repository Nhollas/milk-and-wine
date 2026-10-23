# Agents

This repository demonstrates [spec-driven development](SPEC-DRIVEN-DEVELOPMENT.md). Specs say what we promise; tests prove it; code delivers it.

## Specs

- Behaviour lives in `specs/**/spec.md`. A row may be proposed: specced, not built. Before relying on a row, run `pnpm spec:status <subject>`. In Claude Code, reading a spec adds its status for you.
- Work arrives as a change in `changes/<change>/spec.md`. It lists the rows to deliver; the rows themselves live in `specs/`.
- To deliver a row, write a test at the row's Verified level, in `<subject>[.<part>].<level>.test.ts`, whose title starts with the row ID. Replace the row's `test.todo`. Unit tests use files without a level and name no rows.
- A subject's tests sit beside its code (`src/loans/`, `tools/spec-trace/`). Journeys and environments have no code of their own, so their tests go in `tests/<level>/`. Test helpers that more than one folder uses go in `tests/support/`.
- Change behaviour by changing its row in the same MR as the code. If code and a row disagree, say so; don't quietly edit either to match.
- Use the terms in [GLOSSARY.md](GLOSSARY.md). Start specs from [specs/TEMPLATE.md](specs/TEMPLATE.md) and changes from [changes/TEMPLATE.md](changes/TEMPLATE.md).

## Code

- No inline comments. Rename or restructure instead, or link the spec or ADR that explains it.
- Name things for what they return or hold, so a reader can predict it without opening them: `filesUnder(directory)`, `rowLines(markdown)`, `remindersDue(today)`. If no plain name fits, the code is doing two jobs: split it.
- Run `pnpm check` (lint and typecheck, format check, knip, tests, `spec:check`) before handing work back.
