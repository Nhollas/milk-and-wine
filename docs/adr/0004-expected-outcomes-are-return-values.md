# 4. Expected outcomes are return values, not exceptions

## Context

Clients and stores reported some outcomes as values (`{ kind: "not-found" }`) and others by throwing a named error (`CatalogueUnavailable`, `CopyOnLoan`, `NotificationRefused`). Callers branched on both, so they had to know which error classes a dependency might throw, wrap calls in `try/catch` with `instanceof`, and the type checker couldn't tell them when they had missed one.

## Decision

An outcome a caller is expected to handle is part of the return type, as a union tagged by `kind`: an unavailable catalogue, a refused notification, a copy already on loan. Exceptions are kept for bugs and broken invariants, such as a database row that doesn't match its schema ([ADR 3](0003-parse-database-rows-with-zod.md)), which no caller handles locally.

## Consequences

- A caller sees every outcome in the type it receives and can't forget one without the type checker noticing.
- Modules export no error classes for callers to catch.
- An unexpected exception is no longer swallowed by a broad `catch`: a sweep that hits a bug stops instead of counting it as a failed reminder.
- A client that wraps `fetch` must turn connection failures into a value itself.
