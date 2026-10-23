# Agents

This repository demonstrates [spec-driven development](SPEC-DRIVEN-DEVELOPMENT.md). Specs say what
we promise; tests prove it; code delivers it.

## Specs

- Behaviour lives in `specs/**/spec.md`. A row may be proposed: specced, not built. Before relying
  on a row, run `pnpm spec:status <subject>`. In Claude Code, reading a spec adds its status for you.
- Work arrives as a change in `changes/<change>/spec.md`. It lists the rows to deliver; the rows
  themselves live in `specs/`.
- To deliver a row, write a test at the row's Verified level, in
  `<subject>[.<part>].<level>.test.ts`, whose title starts with the row ID. Replace the row's
  `test.todo`. Unit tests use files without a level and name no rows.
- Change behaviour by changing its row in the same MR as the code. If code and a row disagree,
  say so; don't quietly edit either to match.
- Use the terms in [GLOSSARY.md](GLOSSARY.md). Start specs from [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md)
  and changes from [CHANGE-TEMPLATE.md](CHANGE-TEMPLATE.md).

## Code

- No inline comments. Rename or restructure instead, or link the spec or ADR that explains it.
- Run `pnpm check` (typecheck, tests, `spec:check`) before handing work back.
