# Team notes

Foreman runs on Claude Code [agent teams](https://code.claude.com/docs/en/agent-teams). The session that runs `/foreman` is the lead, and each teammate is spawned from an agent definition.

## What a teammate gets

- Spawn each with `Agent`, a `subagent_type` naming its definition, and a `name` such as `test-writer-43`. A name is what makes it a teammate; never pass `isolation` or fork, which make an ordinary subagent instead.
- Its definition fixes its tools, model and instructions. It loads `AGENTS.md` and the project's skills itself, but not your conversation, so the spawn prompt carries everything about the assignment.
- Teammates can't spawn teammates. Only you spawn, assign and shut down.

## The spawn prompt

Fill the placeholders, leave out empty sections and copy `<rules>` as written. Don't restate the definition's instructions.

```text
<assignment>
Ticket: #<n>, part of change spec #<change spec>
Subject: <subject>
Scenarios: <IDs>
</assignment>

<checkout>
Branch: ticket/<n>-<slug>
Base: <commit on main the branch started from>
Tests: <the test writer's commit; implementer and later>
</checkout>

<team>
Lead: <your name>
Send findings to: <teammate names; standards reviewer only>
</team>

<handed_over>
<what earlier steps sent that this one needs, such as the implementer's Verification section>
</handed_over>

<rules>
Work only on the branch named above, and check it's checked out before you change anything.
Send your handoff, blockers and questions to the lead with SendMessage.
A finding you disagree with goes back with your reason; don't ignore it.
</rules>
```

## Running the pipeline

- Messages and idle notifications arrive on their own; don't poll. A teammate's final answer comes in its idle notification.
- A teammate sends its result to you, except that the standards reviewer sends findings to the implementer and test writer directly and tells you when the change is ready.
- Shut a teammate down once its step has passed and nothing can come back to it.
- `/resume` doesn't restore teammates. After resuming, check the branch, its commits and the ticket's PR, and spawn fresh teammates for what isn't done. A check whose result you can't find is run again.
- Turning agent teams on in [settings](../../../settings.json) also makes any subagent you name a teammate.
