Issues and tickets are markdown files under `.issues/`, which git ignores, so nothing about the work is committed or leaves the machine. Refer to an issue as `<issue-slug>`, and a ticket as `<issue-slug>#<NN>`.

### Open an issue

Write `.issues/<issue-slug>/issue.md`, starting `# <title>` then `Status: open`. Link a spec relative to the file, as `../../<path>`.

### Read an issue

Read its `issue.md` and every file in its `tickets/`.

### Add an image to an issue

Copy the image into the issue's folder, and add `![<alt>](<file>)` to `issue.md`.

### Create a ticket

Write `.issues/<issue-slug>/tickets/<NN>-<slug>.md`, where `NN` counts from `01` in landing order. Start it `# <title>` then `Blocked by: <NN>, <NN>`, or `Blocked by: none`.

### Find the ready tickets

A ticket's branch is `ticket/<issue-slug>/<NN>-<slug>`. A ticket with a `## Review` section is closed once `git merge-base --is-ancestor <branch> main` succeeds, and up for review until then. Take the tickets in `NN` order: one is ready when it has no `## Review` section and every ticket its `Blocked by` names is closed.

### Branch for a change

From `main`. A spec change's branch is `spec/<change>`, and a ticket's as above.

### Put a change up for review

For a ticket, add `## Review` to its file with the branch name, then the body under it. For a spec change, add `## Spec change` to `issue.md` with the branch name and the body. Tell the user to review it with `git diff main...<branch>` and merge it with `git merge --no-ff <branch>`, unsquashed, so the ticket shows as closed.

### Close an issue

Change its `Status:` to `closed`.
