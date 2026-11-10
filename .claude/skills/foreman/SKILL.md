---
name: foreman
description: Deliver an issue's tickets one at a time, each to a change up for review.
argument-hint: <issue>
arguments: [issue]
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PROJECT_DIR}/docs/agents/issue-tracker/active.sh)
---

Deliver the tickets of issue $issue in landing order, one at a time, in this checkout.

## Each ticket

1. **Find the next ticket.** Read the issue and find its ready tickets, then take the first. With none ready, tell the user which changes to review and merge, and stop.
2. **Branch** for the ticket on a clean tree, or check out its branch if it exists.
3. **Deliver** it with the `deliver` skill, given the ticket's subject, scenario IDs and decisions. When it replies with a question, put it to the user, then deliver again with the answer.
4. **Put it up for review** with the review `deliver` replied with. Check out `main`, and go back to step 1.

Stop by giving the user each change you put up for review, and anything unresolved: a blocker, a disagreement, or a check that couldn't run.

## Issue tracker

!`${CLAUDE_PROJECT_DIR}/docs/agents/issue-tracker/active.sh`
