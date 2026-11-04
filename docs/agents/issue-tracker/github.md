Issues and tickets are GitHub issues, and a ticket is a sub-issue of its issue. Refer to either as `#<n>`.

### Open an issue

`gh issue create --title <title> --body-file <body>`. Link a spec as `../blob/main/<path>`.

### Read an issue

`gh issue view <n> --comments`, and its tickets with `gh api repos/{owner}/{repo}/issues/<n>/sub_issues --jq '.[] | {number, title, state}'`.

### Add an image to an issue

Add `![<alt>](<local png>)` to the body, then run `gh issue edit <n> --body-file <body> --attach <png>`, which uploads the image in place of the local path.

### Create a ticket

`gh issue create --title <title> --body-file <body> --parent <issue> --blocked-by <numbers>`. Create blockers first, so their numbers exist.

### Find the ready tickets

For each open ticket, in the order its issue lists them, read its blockers with `gh api repos/{owner}/{repo}/issues/<ticket>/dependencies/blocked_by --jq '.[] | {number, state}'` and its PRs with `gh pr list --state all --search "Closes #<ticket> in:body" --json number,state,url`. A ticket is ready when it has no PR and every blocker is closed.

### Branch for a change

From the latest `origin/main`. A spec change's branch is `spec/<change>`, and a ticket's `ticket/<n>-<slug>`.

### Put a change up for review

Push the branch and run `gh pr create --title <title> --body-file <body>`. A ticket's body starts `Closes #<ticket>. Part of #<issue>.`, and a spec change's `Part of #<issue>.`

### Close an issue

`gh issue close <n>`.
