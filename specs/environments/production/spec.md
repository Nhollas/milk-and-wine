# Production

The deployed loans service and its daily reminders sweep, as members reach them.

| Scope | |
| --- | --- |
| **Owns** | What must hold once the container image is deployed: reachability, configuration and schedule. |
| **Depends on** | [Loans](../../modules/loans/spec.md), [reminders](../../modules/reminders/spec.md), and the platform's container hosting and scheduler. |
| **Excluded** | How the platform runs containers. We state what we rely on, not how it is provided. |

## Behaviour

### Serving members

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B1 | The service is deployed | `GET /health` arrives at its public URL | Responds `200` with `{ "status": "ok" }` | smoke |
| B2 | Catalogue copy `SMOKE-1` is reserved for smoke tests | The smoke suite lends and returns it | Responds `201`, then `200`, so the deployment reaches the real Catalogue API and keeps loans | smoke |

### Reminding members

| ID | Given | When | Then | Verified |
| --- | --- | --- | --- | --- |
| B3 | The reminders job is deployed | It is 09:00 UTC | The sweep runs once that day against the same database as the service | manual [runbook](../../../docs/runbooks/reminders-schedule.md) |

## Limitations

None.

## Open questions

None.
