# Milk and wine

Specs come in two kinds. Wine gets better with age: a behaviour spec that lasts and is refined as the system grows. Milk goes off: a change spec that exists to deliver one piece of work and is thrown out once it's done. This repository is about the wine, and how to make people and agents trust it.

The ideas are tried out on a small library service: members borrow copies, get reminded when they're late, and bring them back.

For why this repository exists, see [INTENT.md](INTENT.md).

## Try it

```bash
pnpm install
```

```bash
pnpm check
```

## Where things are

| Path | What it shows |
| --- | --- |
| [SPEC-DRIVEN-DEVELOPMENT.md](SPEC-DRIVEN-DEVELOPMENT.md) | The process, mostly as diagrams |
| [GLOSSARY.md](GLOSSARY.md) | The terms specs, code and conversation share |
| [CODING-STANDARDS.md](CODING-STANDARDS.md) | How code and tests are shaped and named |
| [AGENTS.md](AGENTS.md) | What every agent session starts with |
| [specs/TEMPLATE.md](specs/TEMPLATE.md) | Where every spec starts |
| [specs/journeys/borrow-a-book](specs/journeys/borrow-a-book/spec.md) | A journey across modules, proven by system tests |
| [specs/modules/loans](specs/modules/loans/spec.md) | A module with service rows, a dependency row, out-of-order IDs and proposed rows |
| [specs/modules/catalogue](specs/modules/catalogue/spec.md) | An external API client with integration rows |
| [specs/modules/reminders](specs/modules/reminders/spec.md) | A scheduled job with service and integration rows |
| [specs/tools/spec-mutants](specs/tools/spec-mutants/spec.md) | The spec mutants tool's own rules, proven the same way |
| `src/<module>/`, `tools/<tool>/` | Code, with its subject's tests beside it |
| `tests/system/` | Tests for journeys, which have no code of their own |
| [docs/adr](docs/adr) | Decisions with lasting trade-offs |
| [.claude/agents](.claude/agents) | The `mutant-writer` and `intent-judge` agents |
| [tools/spec-mutants](tools/spec-mutants), [tools/intent-evals](tools/intent-evals) | Spec mutants, and evals for the intent judge |

## Running the service

```bash
DATABASE_PATH=loans.db CATALOGUE_URL=https://catalogue.example pnpm start:loans
```

```bash
DATABASE_PATH=loans.db NOTIFY_URL=https://notifications.example pnpm start:reminders
```
