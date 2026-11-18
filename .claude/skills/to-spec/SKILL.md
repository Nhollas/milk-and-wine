---
name: to-spec
description: Turn the current conversation into a behaviour spec and the issue that proposes it, then put the spec change up for review. No interview, just synthesis of what's already been settled.
argument-hint: <subject>
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PROJECT_DIR}/.claude/issue-tracker/active.sh)
---

Turn what this conversation has settled about $ARGUMENTS into a behaviour spec and an issue. Do NOT interview the user; synthesise what you already know. If the behaviour hasn't been settled yet, tell the user to run `/grill-with-docs` first.

## 1. Gather context

Read the subject's spec, if it has one, [the spec rules](../../rules/specs.md), [the glossary](../../../GLOSSARY.md) and any ADRs in the area. Use the glossary's terms throughout.

## 2. Draft the rules and their scenarios

Write each behaviour the conversation settled as a **rule**: one statement of how the subject behaves, as a `###` heading. Under it, write the scenarios that are examples of it, until a reader couldn't misread the rule:

- one for the plain case;
- one on each side of every boundary the rule has, such as a limit, a date or an empty value;
- one for each way it's refused.

Each scenario states only the values that decide its outcome. For an existing subject, reshape its spec rather than appending, and give each new scenario the next ID the subject hasn't used.

When writing a scenario out raises a choice the conversation didn't settle, don't pick an answer. Put it in the spec's Open questions with your recommendation, and tell the user before going on.

Draft the spec from [the template](assets/spec.md).

## 3. Draft the issue

Draft the issue from [the issue template](assets/issue.md), titled with the change in a few words:

- **Why:** the reason the change is happening.
- **Scenarios:** every scenario the change adds or changes.
- **Out of scope:** what the conversation chose to leave for later, so nobody asks again.
- **Decisions:** each choice the conversation settled that an observer couldn't tell apart, so the spec leaves it out, such as a test seam or a default. `/to-tickets` copies each into the tickets it affects.

## 4. Put the spec change up for review

Branch for the spec change. Write the spec to `specs/<kind>/<subject>/spec.md`, and add a `test.todo("B<n>: …")` for each new scenario verified by a test. Open the issue, then commit and put the spec change up for review, listing the scenario IDs it proposes. Tell the user where each is.

## 5. Refine it from review

Review happens on the spec change, not in chat. Address each comment by changing the spec, and the issue if it's affected, and reply to it. Put each behavioural choice a comment raises to the user. The spec is agreed when the user merges it.

## Issue tracker

!`${CLAUDE_PROJECT_DIR}/.claude/issue-tracker/active.sh`
