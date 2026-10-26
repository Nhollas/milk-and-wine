# Gaps in the reminders tests

Parts of [reminders' rows](../specs/modules/reminders/spec.md) that their tests don't check. The intent judge trials found them, and each was rechecked on 26 October 2026 by planting the bug it points at: the whole suite still passes.

Close each one with a test of the row's own. Then delete it from here, and delete this page once it's empty.

| Row | Part | Bug the suite misses | To close it |
| --- | --- | --- | --- |
| B4 | Given "the job has handled every overdue loan" | Logging `reminders.finished` after each reminder as well as at the end. B4's tests check only the last log. | Assert `reminders.finished` is logged exactly once, after every other event. |
| B5 | `POST {NOTIFY_URL}/notifications` | Dropping `NOTIFY_URL`'s path, as `new URL("/notifications", baseUrl)` does. The test's `NOTIFY_URL` has no path, so it can't tell. | Give one B5 test a `NOTIFY_URL` with a path, such as `http://notifications.test/api`. |
| B3 | Why: "We don't retry within a run" | Sending a refused reminder a second time in the same run. The fake refuses both times, and nothing counts the attempts. | Decide first whether a Why note is a promise. If it is, move it into B3's Then and assert one attempt per loan. If not, drop this gap. |

## Closed since the trials

The trials also found these, and they are now caught by their row's own tests. The trials themselves are in git history, under `docs/research/` before this page was added.

- B1 working out today in local time, not UTC.
- B1 a reminder from an earlier day blocking today's.
- B1 sending only loans exactly one day overdue.
- B5 counting a `5xx` as accepted.
- B5 refusing a `2xx` other than `200`, `202` or `204`.
