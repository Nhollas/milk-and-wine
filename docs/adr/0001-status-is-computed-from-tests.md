# 1. A row's status is computed from tests

## Context

Specs land on `main` before their code, so several MRs can deliver one change and the team can review behaviour first. Readers then need to know which rows are built. A status field kept by hand would drift from the code.

## Decision

A row is delivered when an active test at its Verified level names it, and proposed otherwise. `spec:status` has Vitest collect the tests without running them, rather than reading test results. CI runs every test on every merge, so a test that exists on `main` is a passing test.

## Consequences

- Nobody edits a status, and an agent can ask for one with `spec:status <subject>`.
- A test can name a row and assert too little. Review catches that; tooling doesn't.
- Status read on a branch with a failing test is optimistic until CI runs.
