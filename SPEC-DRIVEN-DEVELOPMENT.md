# Spec-driven development

How specs, changes and tests fit together in this repository. Specs exist so people and agents agree on behaviour before it's built, and keep agreeing after. If a person can't skim one, it has failed at its main job.

Write or change a spec with the `/write-spec` skill.

## 1. Milk and wine

```
  ┌───────────────────────────────┐          ┌───────────────────────────────┐
  │ CHANGE SPEC              milk │          │ BEHAVIOUR SPEC           wine │
  │ changes/renew-a-loan  LIB-42  │          │ specs/modules/loans/spec.md   │
  ├───────────────────────────────┤          ├───────────────────────────────┤
  │ why we're doing it            │          │ B1   lends an available copy  │
  │ adds   loans B8+ B9+          │  wraps   │ B2   refuses a copy on loan   │
  │ adds   borrow-a-book B4+      │ ───────▶ │ B8   renews          proposed │
  │ delivery: 3 MRs               │          │ B9   refuses renewal proposed │
  │ change-only checks            │          │                               │
  │ before deleting: checklist    │          │ what we promise, right now    │
  └───────────────────────────────┘          └───────────────────────────────┘
     born with the work                         lives with the code
     deleted with its last row                  refined over time
     learnings move out first                   ages well only if pruned
```

A change spec never owns a requirement. It points at rows, carries the Jira key, and goes away. This repository keeps the idea but doesn't practise it: its changes are small and come straight from a behaviour spec, and breaking work down is out of scope (see [INTENT.md](INTENT.md)), so there is no change template or live example. Behaviour specs keep only what's needed now: existing code is evidence, not a reason to keep a row.

## 2. Anatomy of a row

```
 ┌─────┬────────────────────┬──────────────────┬──────────────────────┬────────────┐
 │ ID  │ Given              │ When             │ Then                 │ Verified   │
 ├─────┼────────────────────┼──────────────────┼──────────────────────┼────────────┤
 │ B2  │ the copy has an    │ POST /loans      │ responds 409         │ service    │
 │     │ open loan          │ arrives for it   │ copy-on-loan and     │            │
 │     │                    │                  │ creates no loan      │            │
 └─────┴────────────────────┴──────────────────┴──────────────────────┴────────────┘
    ▲     ▲                    ▲                  ▲                      ▲
    │     │                    │                  │                      └ what proves it:
    │     │                    │                  │                        service · integration · system
    │     │                    │                  │                        dependency · manual
    │     │                    │                  └ what an observer at the boundary sees
    │     │                    └ the one event that sets it off
    │     └ the state the world is already in
    └ stable forever, never reused
```

One row, one decision. Test links and gap reports assume it.

```
  B1  "validates, checks the catalogue and lends"     ✗ three decisions in one row
   │
   ├──▶ B10  refuses an invalid request                ✓ each can be linked to a
   ├──▶ B4   refuses a copy the catalogue doesn't know   ticket and to a test
   └──▶ B1   lends an available copy
```

That's why [loans](specs/modules/loans/spec.md) lists B10 first: it was split out later, and IDs never move.

## 3. Anything with a boundary can be a subject

```
             ┌──────────────┐        ┌──────────────┐
             │   JOURNEY    │        │    MODULE    │
             └──────┬───────┘        └──────┬───────┘
                    ▼                       ▼
  folder     specs/journeys/         specs/modules/
  boundary   the member              the module's edges
  proof      system test             service, integration
  example    borrow-a-book B3        loans B2
```

A row is a promise someone checks. The subject decides where you observe it and how it's proven.

## 4. Status is computed, never typed

```
  main ─────────────●───────────────●───────────────●──────▶
                    │               │               │
                    MR 1            MR 2            MR 3
                    adds the rows   delivers        delivers
                    as proposed     loans B8 B9     journey B4
                    ▲
                    └ this repo

  loans B8          ░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  loans B9          ░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
  borrow-a-book B4  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓

  ░ proposed: no active test at the row's level names it, e.g. test.todo("B8: …")
  ▓ delivered: an active test at the row's Verified level names it
```

Specs land ahead of code, so behaviour is agreed before it is built.

## 5. Names the tooling reads

```
  src/loans/loans.http.service.test.ts
            └─┬─┘ └┬─┘ └──┬──┘
              │    │      └─ level: service · integration · system, or none
              │    └─ part: optional, to split a subject's tests
              └─ subject: the name of a folder under specs/

  test("B2: refuses a copy that is already on loan", async () => { … })
        └┬┘
         └─ the row it proves, then what it checks
```

IDs are plain, so the file name says which subject's `B2` a test means ([ADR 0002](docs/adr/0002-test-file-names-carry-subject-and-level.md)).

## 6. Proof has to reach the boundary

```
                 ┌──────────────────── loans ────────────────────┐
  POST /loans ─▶ │  validate ─▶ catalogue ─▶ store ─▶ respond    │ ─▶ 201 { dueOn … }
                 └───────────────────────────────────────────────┘
                                               ▲                    ▲
              clock.test.ts ───────────────────┘                    │
              no level, so it names no row                          │
                                                                    │
              loans.service.test.ts › "B1: …" ──────────────────────┘
              service level, so it delivers B1
```

A row describes what's observable at its subject's boundary, so only a test at the row's level can deliver it. Unit tests are still welcome; they just don't count.

## 7. The gaps are the backlog

```
      SPEC ROWS                  TESTS                       CODE
   ┌───────────┐             ┌──────────────┐            ┌───────────────┐
   │ B1        │ ──────────▶ │ "B1: …"      │ ─────────▶ │ POST /loans   │
   │ B11       │ ──────────▶ │ "B11: …"     │ ─────────▶ │ GET /health   │
   │ B8        │ ───╳        │              │            │               │
   │           │        ╳─── │ "retries…"   │            │               │
   │           │             │              │       ╳─── │ cacheCopy()   │
   └───────────┘             └──────────────┘            └───────────────┘
        (1)                        (2)                          (3)

  (1) a row nothing proves     →  proposed: work to do
  (2) a test that names no row →  untagged-test: tag it or delete it
  (3) code that no row needs   →  excess: prune it
```

Finding them is a review for now. The intent judge checks that a row's tests are about what the row says; spec mutants check they are strong enough to fail when the code breaks it. Run the judge first, fix any misalignment, then run the mutants.

## 8. What we threw out

```
  ✗  specs as source of truth, regenerate the code    specs leave things out on purpose
  ✗  long specs written for agents                    unreadable for people, so no alignment
  ✗  a Gherkin runtime and step definitions           keep the grammar, skip the extra codebase
  ✗  a hand-kept status per row                       it drifts; compute it from tests
  ✗  a test count per row                             a declared proof per row
```
