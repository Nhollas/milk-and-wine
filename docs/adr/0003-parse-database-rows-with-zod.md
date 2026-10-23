# 3. Parse database rows with zod, not an ORM

## Context

`node:sqlite` returns rows as `Record<string, SQLOutputValue>`. The stores cast them to hand-written record types that repeat the `CREATE TABLE` in `src/database.ts`, so a row that doesn't match, or a schema that drifts, goes unnoticed. Env vars and HTTP bodies are already parsed with zod; the database was the one input taken on trust.

An ORM or query builder (Drizzle, Prisma, Kysely) would infer types from a schema definition, but still trusts what the driver returns. For two tables and a handful of queries it would also add a schema DSL, likely a migration tool, and hide SQL that currently reads well.

## Decision

Each store parses the rows it reads with a zod schema that also maps column names to the domain type. Store types such as `Loan` are derived from those schemas. Queries stay as plain SQL through `node:sqlite`.

## Consequences

- A row that doesn't match its schema throws at the store, instead of passing bad data on.
- Dates stored as `TEXT` are checked to be ISO dates.
- Each row shape is written once, in the store that reads it.
- The schemas still repeat the table definitions; drift is caught at runtime by tests, not at compile time.
- Revisit a query builder (Kysely first, as it stays close to SQL) if the schema needs migrations or the queries grow substantially.
