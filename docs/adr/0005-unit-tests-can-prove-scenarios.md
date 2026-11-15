# 5. Unit tests can prove scenarios

## Context

[ADR 2](0002-test-file-names-carry-subject-and-level.md) named three levels that prove scenarios, `service`, `integration` and `system`, and said a file without a level is a unit test and names no scenarios. A service test ran in the test's process with fakes of our clients, just as a unit test does, and Vitest ran the two the same way. The only thing the level added was permission to name scenarios, so a service test was a unit test under another name. In `tools/` and `evals/`, where nothing is faked, the name meant nothing at all.

## Decision

There are three levels, named for what's real at the edge:

- **unit**: runs in the test's process, with fakes of our clients and no HTTP.
- **integration**: one of our clients against MSW handlers for its external API.
- **system**: the whole app against the same handlers.

A test file is named `<subject>[.<part>][.<level>].test.ts`, and a unit test has no level. A test whose title starts with a scenario ID proves that scenario, whatever its level, and Verified names `unit`, `integration` or `system`.

This replaces ADR 2's list of levels and its rule that unit tests name no scenarios. The rest of ADR 2 stands.

## Consequences

- A file name no longer says whether a test proves a scenario. Its titles do.
- A test still has to check everything its scenario's Then says, so a test of one function inside rarely proves a scenario about an app. The intent judge catches one that doesn't.
- A unit test's subject is the first part of its name, so a unit test named for a folder under `src/` or `tools/` must sit in that folder.
