# 2. Test file names carry the subject and the level

Superseded in part by [ADR 5](0005-unit-tests-can-prove-scenarios.md): unit tests can prove scenarios, and `service` is gone.

## Context

Scenario IDs are plain (`B5`) so they stay short in specs, tests and conversation. Every subject has its own `B5`, so a test's title can't say which subject it means.

## Decision

A test file is named `<subject>[.<part>].<level>.test.ts`. The subject is the spec's folder name, and the level is `service`, `integration` or `system`. A test title starts with the scenario ID. Files without a level are unit tests and name no scenarios.

## Consequences

- The file name says where a test belongs and whether it can deliver a scenario.
- A subject's name must be unique across `specs/`.
- Renaming a spec folder means renaming its test files.
