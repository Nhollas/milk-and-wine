Issues and tickets are markdown files under `.issues/`, which git ignores, so nothing about the work is committed or leaves the machine. Refer to an issue as `<issue-slug>`, and a ticket as `<issue-slug>#<NN>`. Nobody reviews a change, so putting one up for review merges it. This file is also a trial's `ISSUE-TRACKER.md`, so it names no other file here.

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

Merge it into `main`, unsquashed, which closes a ticket. For a ticket, commit its work on its branch first, then run this from the repository's root, with `<branch>` its branch and `<ticket-file>` its file:

```sh
printf '\n## Review\n\n%s\n' '<branch>' >> '<ticket-file>'
git switch main
git merge --no-ff --no-edit '<branch>'
```

Then add the body under its `## Review`. For a spec change, add `## Spec change` to `issue.md` with the branch name and the body, and merge it the same way.

### Close an issue

Change its `Status:` to `closed`.
