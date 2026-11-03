# GitHub notes

Commands for reading a change spec and its tickets. They need GitHub CLI 2.94 or later. These haven't been run yet; if one fails, find the right form with `gh <command> --help` or the [REST docs](https://docs.github.com/en/rest/issues), and fix this file.

- **The change spec:** `gh issue view <n> --comments`.
- **Its tickets, in order:** `gh api repos/{owner}/{repo}/issues/<n>/sub_issues --jq '.[] | {number, title, state}'`. The change spec's Tickets section gives the landing order.
- **What blocks a ticket:** `gh api repos/{owner}/{repo}/issues/<ticket>/dependencies/blocked_by --jq '.[] | {number, state}'`.
- **Whether a ticket has a PR:** `gh pr list --state all --search "Closes #<ticket> in:body" --json number,state,url`.
