# Spec mutants

Checks that a spec's tests fail when the code breaks a requirement of their scenarios, by planting committed mutants and replaying only that scenario's tests, for engineers, reviewers and agents.

| Scope |  |
| --- | --- |
| **Owns** | The `mutants.json` format, `spec:mutants:check` and `spec:mutants`. |
| **Depends on** | `tools/specs`, to read scenarios. Vitest, to run a scenario's tests. TypeScript, to typecheck `src/`. |
| **Excluded** | Writing mutants. The `mutant-writer` agent writes them; this tool only checks and replays what it wrote. |

**Terms.** A _mutant_ is a small, deliberate bug in `src/`, kept in a subject's `mutants.json`, that should break one requirement of a scenario's Then. Its `breaks` is the plain sentence saying which requirement, such as "the reminder isn't recorded", and its `find` is the lines of its file that it replaces. A mutant is _killed_ when its scenario's tests fail with it planted, and _survived_ when they pass.

## Behaviour

### Reading mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | No spec folder has the name given | `spec:mutants:check <subject>` or `spec:mutants <subject>` runs | Prints `unknown subject: <subject>`, and exits `1` | unit |
| B26 | The subject's spec folder has no `mutants.json` | `spec:mutants:check <subject>` or `spec:mutants <subject>` runs | Prints `no mutants for <subject>: expected <path>`, and exits `1` | unit |
| B2 | A subject's `mutants.json` doesn't match the `mutants.json` format | Either command runs for that subject | Prints `<path> is not valid:` and each error, naming the field, and exits `1` | unit |

### Checking mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | `src/` doesn't typecheck with no mutant planted | `spec:mutants:check <subject>` runs | Prints `src/ must typecheck before any mutant is planted:` and the errors, plants nothing, and exits `1` | unit |
| B4 | An entry in `mutants.json` names an ID its spec lacks | `spec:mutants:check <subject>` runs | Reports `unknown-id` with the ID, and exits `1` | unit |
| B6 | A mutant's `find` lines don't appear exactly once in its file, or the file is gone | `spec:mutants:check <subject>` runs | Reports `stale` with the ID and the mutant's `breaks`, and exits `1` | unit |
| B10 | A mutant doesn't typecheck when planted | `spec:mutants:check <subject>` runs | Reports `compile-error` with the ID, the mutant's `breaks` and the errors, and exits `1` | unit |
| B12 | A scenario verified by a test has no entry in `mutants.json` | `spec:mutants:check <subject>` runs | Lists its ID under `no mutants yet`, without changing the exit code | unit |
| B13 | Nothing B3, B4, B6 or B10 reports | `spec:mutants:check <subject>` runs | Prints `ok` and the `breaks` of each mutant, then `spec:mutants:check passed`, and exits `0` | unit |

### Replaying mutants

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B15 | A scenario's Then differs from the `then` stored in its entry | `spec:mutants <subject>` runs | Reports `then-changed` with the ID and shows both, as `was … now …`, replays none of that scenario's mutants, and exits `1` | unit |
| B16 | A scenario's tests fail, or none exist, with no mutant planted | `spec:mutants <subject>` runs | Reports `its tests must pass with no mutant planted, but they failed`, or `but there are none`, replays none of that scenario's mutants, and exits `1` | unit |
| B17 | At least one of a scenario's tests fails with a mutant planted | `spec:mutants <subject>` replays the mutant | The mutant is `killed` | unit |
| B27 | All of a scenario's tests pass with a mutant planted | `spec:mutants <subject>` replays the mutant | The mutant is `survived` | unit |
| B28 | A test of a kind other than the scenario's Verified names, or whose title doesn't start with its ID, would fail with a mutant planted, and the scenario's tests pass | `spec:mutants <subject>` replays the mutant | The mutant is `survived`: only tests of the kind its Verified names whose title starts with its ID run | unit |
| B21 | A mutant's `find` lines don't appear exactly once in its file, or the file is gone | `spec:mutants <subject>` runs | Reports `stale` for it, doesn't plant it, and exits `1` | unit |
| B22 | Every mutant to replay has a status, and at least one `survived` | `spec:mutants <subject>` finishes | Prints each scenario's current Then, read from the spec, then one line per mutant with `killed` or `survived` and its `breaks`, and exits `1` | unit |
| B29 | Nothing B15, B16 or B21 reports, and every mutant is `killed` | `spec:mutants <subject>` finishes | Prints each scenario's current Then, read from the spec, then one line per mutant with `killed` and its `breaks`, and exits `0` | unit |
| B25 | `spec:mutants <subject>` is planting mutants | The run finishes, fails or is stopped | No file under `src/` changes on disk at any point | unit |

**Why**

- **B25:** A run can be stopped at any point, and one that wrote to `src/` could leave a planted bug there.

## Limitations

- A mutant is judged only against its own scenario's tests. A test for another scenario that would catch it doesn't count.
- Rewording a scenario's Then needs its mutants rewritten, because the stored `then` must match it word for word.
- A mutant planted in code nothing calls any more, left behind by a refactor, is reported `survived`, though the test isn't at fault.

## Open questions

None.
