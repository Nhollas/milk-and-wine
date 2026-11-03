# Milk and wine

Specs come in two kinds. Wine gets better with age: a behaviour spec that lasts and is refined as the system grows. Milk goes off: an issue on GitHub that exists to deliver one piece of work, closed once it's done. This repository is about the wine, and how to make people and agents trust it.

The ideas are tried out on a small library app: members borrow copies of books, get reminded when they're overdue, and bring them back.

For why this repository exists, see [INTENT.md](INTENT.md).

## Try it

```bash
pnpm install
```

```bash
pnpm check
```

## Where to start

[INTENT.md](INTENT.md) says why this exists and what's being tested. [Spec-driven development](docs/spec-driven-development.md) shows the whole approach, from specs to the review checks, and [the workflow](docs/workflow.md) shows how a change gets from an idea to merged code. Specs live under `specs/`, with the code and its tests under `src/` and `tools/`.

## Running the app

```bash
DATABASE_PATH=loans.db CATALOGUE_URL=https://catalogue.example pnpm start:loans
```

```bash
DATABASE_PATH=loans.db NOTIFY_URL=https://notifications.example pnpm start:reminders
```
