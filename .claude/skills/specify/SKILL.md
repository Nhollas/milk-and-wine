---
name: specify
description: Grill the user until a change's behaviour is settled, agree the spec in a shared doc, then open its issue and put the spec up for review.
argument-hint: <subject or idea>
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PROJECT_DIR}/.claude/issue-tracker/active.sh)
---

Specify this change: $ARGUMENTS

## 1. Grill

Read the subject's spec, if it has one. Then interview the user relentlessly about the change's behaviour until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body>

➡️ <your recommended answer>
```

Keep each question to one or two sentences. Give options as a short list only when there's a real choice, and the recommendation in one line with one reason.

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The grilling is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed, and the user confirms you have reached a shared understanding.

Then propose the terms the grilling settled that [the glossary](../../../GLOSSARY.md) lacks, each with a one-line definition and any words to avoid, and wait for the user to agree them. Use them in the draft.

## 2. Draft the spec in a doc

Read [the spec rules](../../rules/specs.md). Load `anthropic-skills:docs` and draft the spec there from [the template](assets/spec.md); for an existing subject, start from its current spec. Without docs, draft in the spec file.

## 3. Refine it from comments

Read every comment, change the doc and reply in each thread. Put each behavioural choice a comment raises to the user. The doc is done when the user says it's agreed.

## 4. Write the spec

Branch for the spec change, naming it in a few words. Add the agreed terms to the glossary with the `domain-modeling` skill. Write the spec to `specs/<kind>/<subject>/spec.md`, and add a `test.todo("B<n>: …")` for each new scenario verified by a test.

## 5. Open the issue and put the spec up for review

Draft the issue from [the issue template](assets/issue.md), titled with the change in a few words, and the spec change's title. Once the user agrees them, open the issue, then commit and put the spec change up for review, listing the scenario IDs it proposes. Tell the user where each is, and ask whether to delete the doc.

## Issue tracker

!`${CLAUDE_PROJECT_DIR}/.claude/issue-tracker/active.sh`
