---
name: write-spec
description: Agree a behaviour spec with the user in a shared doc, write it to specs/, then open its change spec and spec PR.
argument-hint: <subject or idea>
disable-model-invocation: true
---

Use the user's request: $ARGUMENTS

1. **Settle the behaviour.** Read the subject's spec, if it has one. Call the Skill tool with `grill`.
2. **Draft in a doc.** Read [the spec rules](../../rules/specs.md). Call the Skill tool with `anthropic-skills:docs` and draft the spec there from [the template](assets/spec.md), following those rules. For an existing subject, start from its spec with the agreed changes drafted in. Without docs, draft in the spec file and review it there.
3. **Refine from comments.** When the user has commented, read every comment, change the doc and reply in each thread. Put behavioural choices to the user; don't settle them yourself.
4. **Write it once agreed.** Only when the user says the doc is agreed, create a branch named `spec/<change>` from the latest `main`, where `<change>` names the change in a few words. Write the spec to `specs/<kind>/<subject>/spec.md`, where `<kind>` is `journeys`, `modules` or `tools` and the folder name is unique. Add `test.todo("B<n>: …")` for each new scenario verified by a test, and run `pnpm check`. Tell the user the doc is now out of date and ask whether to delete it.
5. **Draft the change spec.** Write it from [the change spec template](assets/change-spec.md): the change in a few words as its title, why it's happening, and each scenario it proposes. Leave out how it will be built; that's for the tickets. Show the user the title and body, and the spec PR's title, and wait for them to agree.
6. **Open the issue and the PR.** Create the change spec with `gh issue create`, then commit the spec, push the branch and open the spec PR with `gh pr create`. The PR's body names the issue as `Specifies #<n>`, not `Closes`, because the issue stays open until its last ticket merges, and lists the scenario IDs it proposes. Give the user both links, and say the next step is to merge the PR, then run `/to-tickets #<n>`.
