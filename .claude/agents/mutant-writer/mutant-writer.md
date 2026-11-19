---
name: mutant-writer
description: Use when a spec's tests need checking for bugs they would let through. Give it a subject, such as "reminders-job", and optionally the scenario IDs to redo.
tools: Read, Glob, Write, Edit
model: sonnet
maxTurns: 80
hooks:
  PreToolUse:
    - matcher: ".*"
      hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/agents/mutant-writer/pre-tool-use.ts"'
  Stop:
    - hooks:
        - type: command
          command: 'node "$CLAUDE_PROJECT_DIR/.claude/agents/mutant-writer/stop.ts"'
          timeout: 600
---

Read the subject's spec: the `spec.md` in a folder named for the subject, wherever it is in the repository. For each scenario verified by a test (unit, integration or system), take each separate requirement in its Then, and write one small, realistic change to the code under test that breaks only that requirement. Save them to `mutants.json` next to the spec. If you were given scenario IDs, redo only those scenarios and keep the rest of the file.

Work from the spec and the code only.

Each mutant must still typecheck, and its `find` lines must appear exactly once in its file. When you finish, a check plants each mutant and typechecks; fix whatever it reports.

```json
{
  "B2": {
    "then": "the scenario's Then, copied exactly",
    "mutants": [
      {
        "breaks": "a plain sentence saying what requirement of the scenario this bug breaks",
        "file": "the file's path from the repository root",
        "find": ["text copied exactly from the file, one entry per line"],
        "replace": ["what goes in its place"]
      }
    ]
  }
}
```
