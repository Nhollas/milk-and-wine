# Handoff: refining the SDD setup

The next session continues refining the spec-driven development (SDD) approach this repository
demonstrates. This is a pre-launch reference repo, so breaking changes are fine.

## Background

The work started in a conversation in `../agent-graph`, about two replies to Matt Pocock's
"how would you define spec-driven development?" thread:

- **SpecDLC:** the spec wraps ACs, then the spec is deleted while the ACs stay. Gaps between ACs
  and implementation drive the work.
- **Daniel Saadia:** write the spec first, fold learnings into repo memory, then delete the spec.

The user's model was already close to SpecDLC's: persistent behaviour specs, plus throwaway
delivery specs. We refined that into the process documented here, then built this repo as a
neutral, standalone reference. **We are not retrofitting agent-graph.**

## Where it's written down (read these, don't re-derive them)

| What | Where |
| --- | --- |
| The process, with diagrams and what we rejected | [SPEC-DRIVEN-DEVELOPMENT.md](SPEC-DRIVEN-DEVELOPMENT.md) |
| Row format and Verified values | [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md) |
| Change spec format and the "before deleting" checklist | [CHANGE-TEMPLATE.md](CHANGE-TEMPLATE.md) |
| How status is computed, and why file names carry subject and level | [docs/adr/](docs/adr) |
| The tooling's rules | [specs/tools/spec-trace/spec.md](specs/tools/spec-trace/spec.md) |
| An in-flight change (MR 1 of 3 done) | [changes/renew-a-loan/spec.md](changes/renew-a-loan/spec.md) |
| Agent rules and glossary | [AGENTS.md](AGENTS.md), [CONTEXT.md](CONTEXT.md) |
| Layout and commands | [README.md](README.md) |

## State

- **Nothing is committed** in this repo: `git init` was run, but there are no commits. CI's
  `--base` check needs history.
- `pnpm check` passes: typecheck, 37 tests, and `spec:check` (36 delivered · 3 proposed · 1 sign-off).
- **Verified beyond the unit tests:**
  - the read hook, fed a simulated Claude Code payload
  - the smoke suite, run against a live local server with a fake catalogue
  - `spec:check --base`, which caught all four seeded errors in a throwaway copy
- **Not verified:**
  - the Dockerfile has never been built
  - the GitLab pipeline has never run
  - the `deploy` job is a placeholder
- **Leftovers in agent-graph:** `../agent-graph/SPEC-DRIVEN-DEVELOPMENT.md` and
  `../agent-graph/SPEC-TEMPLATE.md` are uncommitted earlier drafts. The recommendation is to
  delete them; ask the user first.

## Settled decisions (don't reopen unless the user does)

- **Rows:** Given / When / Then / Verified, with plain IDs that are stable and never reused.
  Owns / Depends on / Excluded sit in a table.
- **Status:** computed from tests, never typed by hand. A test names a row by starting its title
  with the row ID.
- **Proof:** only a test at the level the Verified column names delivers a row. Unit tests are
  exempt and never deliver a row.
- **CI:** fails on unknown IDs or subjects, untagged tests at a delivering level, duplicate IDs,
  unrecognised Verified values, and regressions against the MR's target branch. It never fails on
  a proposed row.
- **Agents:** they learn a row's status from `spec:status`, plus a `PostToolUse` read hook. The
  AGENTS.md rule is the fallback for agent tools without hooks.
- **Jira:** keys go on changes and commits, never on rows.
- **Journeys:** "journey" is the name for subjects that cross modules.
- **ADRs:** still used. The change checklist also routes glossary terms, Why notes, limitations
  and process lessons to their homes.

## Open threads and candidate next steps

1. **Deliver LIB-42 through the process** (MRs 2 and 3 in the change spec), including deleting
   the change folder. This is the best test of whether the flow feels right. It hasn't been tried.
2. **Manual rows still rely on a hand-kept record.** The runbook asks people to record sign-off
   in release notes, which is the hand-kept status the process was meant to avoid. Unresolved.
3. **A dependency row is delivered the moment it's declared,** so it can't be proposed.
   Decide whether that's acceptable.
4. **Finding excess code has no tooling here** (gap 3 in the doc). agent-graph has an
   agent-driven prune workflow that could be adapted.
5. **No MR template** lists the rows added, changed or removed, though we agreed the spec diff
   should be the main thing reviewed.
6. **Smaller gaps:**
   - ADR 0002 requires unique subject names, but nothing enforces it.
   - `test.each` and template-literal titles can't name rows.
   - `smoke` counts as delivered when the test is in the suite, not when it has passed in production.
7. **Readability:** a human hasn't yet judged whether the specs are easy enough to skim.

## Working with this user

- Be concise. When asking a question, give options, mark a recommendation, and keep it short.
- Don't treat agent-graph's conventions as established fact. Reason from first principles.
- Write no inline comments in code, per AGENTS.md.
- Illustrated docs are welcome: roughly 70% diagram and 30% prose.

## Suggested skills

- `grilling`: to stress-test open threads 2–4 before deciding.
- `domain-modeling`: when terms in CONTEXT.md change or an ADR is added.
- `mattpocock-skills:writing-for-agents`: when editing AGENTS.md or the templates.
- `tdd`: when delivering LIB-42's rows (start from the existing `test.todo` entries).
- `mattpocock-skills:code-review`: to review a delivered change against its spec rows.
