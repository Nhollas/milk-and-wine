# Spec mutants

Checks that a spec's tests fail when the code breaks a promise their scenarios make, by planting committed mutants and replaying only that scenario's tests, for engineers, reviewers and agents.

| Scope |  |
| --- | --- |
| **Owns** | The `mutants.json` format, `spec:mutants:check` and `spec:mutants`. |
| **Depends on** | `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. TypeScript, to typecheck `src/`. |
| **Excluded** | Writing mutants. The `mutant-writer` agent writes them; this tool only checks and replays what it wrote. |

**Terms.** A _mutant_ is a small, deliberate bug in `src/`, kept in a subject's `mutants.json`, that should break one promise of a scenario's Then. Its `breaks` is the plain sentence saying which promise, such as "the reminder isn't recorded". A mutant is _killed_ when its scenario's tests fail with it planted, and _survived_ when they pass.

## Behaviour

### Reading mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | No spec folder has the name given, or the folder has no `mutants.json` | `spec:mutants:check <subject>` or `spec:mutants <subject>` runs | Prints `unknown subject: <subject>` or `no mutants for <subject>: expected <path>`, and exits `1` | service |
| B2 | A subject's `mutants.json` doesn't match the mutants schema | Either command runs for that subject | Prints `<path> is not valid:` and each schema error, and exits `1` | service |

### Checking mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | `src/` doesn't typecheck with no mutant planted | `spec:mutants:check <subject>` runs | Prints `src/ must typecheck before any mutant is planted:` and the errors, plants nothing, and exits `1` | service |
| B4 | An entry in `mutants.json` names an ID its spec lacks | `spec:mutants:check <subject>` runs | Reports `unknown-id` with the ID, and exits `1` | service |
| B6 | A mutant's `find` lines don't appear exactly once in its file, or the file is gone | `spec:mutants:check <subject>` runs | Reports `stale` with the ID and the mutant's `breaks`, and exits `1` | service |
| B10 | A mutant doesn't typecheck when planted | `spec:mutants:check <subject>` runs | Reports `compile-error` with the ID, the mutant's `breaks` and the errors, and exits `1` | service |
| B12 | A scenario verified by a test has no entry in `mutants.json` | `spec:mutants:check <subject>` runs | Lists its ID under `no mutants yet`, without changing the exit code | service |
| B13 | Nothing B3, B4, B6 or B10 reports | `spec:mutants:check <subject>` runs | Prints `ok` and the `breaks` of each mutant, then `spec:mutants:check passed`, and exits `0` | service |

### Replaying mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B15 | A scenario's Then differs from the `then` copy stored in its entry | `spec:mutants <subject>` runs | Reports `then-changed` with the ID and shows both, as `was … now …`, replays none of that scenario's mutants, and exits `1` | service |
| B16 | A scenario's tests fail, or none exist, with no mutant planted | `spec:mutants <subject>` runs | Reports that its tests must pass with no mutant planted and what they did instead, replays none of that scenario's mutants, and exits `1` | service |
| B17 | A mutant is planted, and its scenario's tests run: only those at the scenario's level whose title starts with its ID | The tests finish | The mutant is `killed` if any of them fails, and `survived` if they all pass | service |
| B21 | A mutant's `find` lines don't appear exactly once in its file, or the file is gone | `spec:mutants <subject>` runs | Reports `stale` for it, doesn't plant it, and exits `1` | service |
| B22 | Every mutant to replay has a status | `spec:mutants <subject>` finishes | Prints each scenario's current Then, read from the spec, then one line per mutant with `killed` or `survived` and its `breaks`, and exits `1` if any mutant survived, `0` otherwise | service |
| B25 | `spec:mutants <subject>` is planting mutants | The run finishes, fails or is stopped | No file under `src/` changes on disk at any point | service |

**Why**

- **B25:** Planting through a Vite `transform` in a replay-only Vitest config applies the mutant as its module loads, so nothing is written to `src/` and an interrupted run leaves nothing behind.

## Limitations

- A mutant is judged only against its own scenario's tests. A test for another scenario that would catch it doesn't count.
- Rewording a scenario's Then needs its mutants rewritten, because the `then` copy must match it word for word.
- A mutant planted in code nothing calls any more, left behind by a refactor, is reported `survived`, though the test isn't at fault.

## Open questions

None.
