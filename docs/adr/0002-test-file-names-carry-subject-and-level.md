# 2. Test file names carry the subject and the level

## Context

Row IDs are plain (`B5`) so they stay short in specs, tests and conversation. Every subject has its own `B5`, so a test's title can't say which subject it means.

## Decision

A test file is named `<subject>[.<part>].<level>.test.ts`. The subject is the spec's folder name, and the level is `service`, `integration`, `system` or `smoke`. A test title starts with the row ID. Files without a level are unit tests and name no rows.

## Consequences

- The file name says where a test belongs and whether it can deliver a row.
- A subject's name must be unique across `specs/`.
- Renaming a spec folder means renaming its test files.
