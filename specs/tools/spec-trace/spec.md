# Spec trace

Works out which spec rows are delivered or proposed, and fails CI when specs and tests disagree, for engineers, reviewers and agents.

| Scope |  |
| --- | --- |
| **Owns** | Reading spec rows and test titles, computing each row's status, `spec:status`, `spec:check`, and the Claude Code read hook. |
| **Depends on** | Git, for `--base`. [ADR 0001](../../../docs/adr/0001-status-is-computed-from-tests.md) and [ADR 0002](../../../docs/adr/0002-test-file-names-carry-subject-and-level.md) explain the rules. |
| **Excluded** | Running tests. CI runs them; spec trace reads their source. |

## Behaviour

### Reading specs and tests

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | A `specs/**/spec.md` has a table headed `ID \| Given \| When \| Then \| Verified` | Spec trace reads the repository | Each row belongs to the subject named by the spec's folder, with its Verified value | service |
| B2 | A test file is named `<subject>[.<part>].<level>.test.ts`, and `<level>` is `service`, `integration`, `system` or `smoke` | A test title in it starts with `B<n>:` | The test names row `B<n>` of that subject. Files named without a level are exempt | service |

### Computing status

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | A row's Verified is a test level | Its status is computed | `delivered` when an active test at that level names it; otherwise `proposed`, with a `todo`, `skipped` or `wrong level` test as proof if one names it | service |
| B4 | A row's Verified is `dependency <link>` or `manual <link>` | Its status is computed | `delivered` or `sign-off` respectively, with the link as proof | service |

### Reporting status

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B5 | Spec rows exist | `spec:status [subject]` runs | Prints each row's ID, Verified, status and proof, for the subject named or for every subject, and exits `0`. `--json` prints the same rows as JSON | service |
| B6 | No spec folder has the name given | `spec:status <subject>` runs | Prints `unknown subject: <subject>` and exits `1` | service |

### Checking

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B7 | A spec repeats an ID, or a Verified value is none of those in B3 and B4 | `spec:check` runs | Reports `duplicate-id` or `invalid-verified` with the spec's path, and exits `1` | service |
| B8 | A test at a delivering level names an ID its subject lacks, belongs to a subject with no spec, or names no row | `spec:check` runs | Reports `unknown-id`, `unknown-subject` or `untagged-test` with the test's file and line, and exits `1` | service |
| B9 | There are proposed rows and nothing B7, B8 or B10 reports | `spec:check` runs | Prints the number of delivered, proposed and sign-off rows, and exits `0` | service |
| B10 | A row is delivered at Git ref `<ref>` and proposed now | `spec:check --base <ref>` runs | Reports `regression` with the subject and ID, and exits `1`. A row deleted from its spec is not a regression | service |

### Telling agents

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B11 | Claude Code's `Read` tool has read a file | The `PostToolUse` hook runs | For a `specs/**/spec.md`, adds that subject's `spec:status` output as additional context. For any other file, prints nothing | service |

## Limitations

- Status trusts CI. A test counts when it exists and isn't marked `todo` or `skip`; CI running the suite on every merge is what makes it a passing test.
- Only literal test titles are read. A title built with a template expression or `test.each` can't name a row.

## Open questions

None.
