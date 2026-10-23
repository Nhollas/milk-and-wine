# SDD example: library loans

A deliberately small service, built to show [spec-driven development](SPEC-DRIVEN-DEVELOPMENT.md)
end to end. Members borrow copies, get reminded when they're late, and bring them back.

The point is the process, not the app. Every kind of subject has a spec, every row is proven by
a named test or a declared check, and one change is half-delivered so you can see what proposed
rows look like.

## Try it

```bash
pnpm install
```

```bash
pnpm spec:status
```

```bash
pnpm spec:status loans
```

```bash
pnpm check
```

`pnpm check` runs the typecheck, the tests and `spec:check`. In Claude Code, open any
`specs/**/spec.md` and the read hook adds its status to the agent's context.

## Where things are

| Path | What it shows |
| --- | --- |
| [SPEC-DRIVEN-DEVELOPMENT.md](SPEC-DRIVEN-DEVELOPMENT.md) | The process, mostly as diagrams |
| [SPEC-TEMPLATE.md](SPEC-TEMPLATE.md), [CHANGE-TEMPLATE.md](CHANGE-TEMPLATE.md) | Where every spec and change starts |
| [specs/journeys/borrow-a-book](specs/journeys/borrow-a-book/spec.md) | A journey across modules, proven by system tests |
| [specs/modules/loans](specs/modules/loans/spec.md) | A module with service rows, a dependency row, out-of-order IDs and proposed rows |
| [specs/modules/catalogue](specs/modules/catalogue/spec.md) | An external API client with boundary rows |
| [specs/modules/reminders](specs/modules/reminders/spec.md) | A scheduled job with service and boundary rows |
| [specs/environments/production](specs/environments/production/spec.md) | Deployment as rows: smoke tests and a manual runbook check |
| [specs/tools/spec-trace](specs/tools/spec-trace/spec.md) | The tooling's own rules, proven the same way |
| [changes/renew-a-loan](changes/renew-a-loan/spec.md) | A change after its first MR: rows landed, code not yet |
| [docs/adr](docs/adr) | Why status is computed, and why file names carry subject and level |
| [.claude/settings.json](.claude/settings.json) | The read hook for agents |
| [.gitlab-ci.yml](.gitlab-ci.yml) | `spec:check` in CI, with `--base` in merge requests |

## Running the service

```bash
DATABASE_PATH=loans.db CATALOGUE_URL=https://catalogue.example pnpm start
```

```bash
DATABASE_PATH=loans.db NOTIFY_URL=https://notifications.example pnpm reminders
```
