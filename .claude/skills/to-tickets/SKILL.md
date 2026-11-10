---
name: to-tickets
description: Break an issue into tracer-bullet tickets from a slice map, created in the issue tracker with their blocking links.
argument-hint: <issue>
arguments: [issue]
disable-model-invocation: true
allowed-tools: Bash(${CLAUDE_PROJECT_DIR}/docs/agents/issue-tracker/active.sh)
---

Break issue $issue into **tickets**: tracer-bullet vertical slices, each naming the tickets that **block** it.

## Process

### 1. Gather context

Read the issue, its full body and comments, then each spec it points at on the latest `main`. Each scenario it proposes is on `main` with a `test.todo`; if its spec change is still up for review, ask the user to merge it first.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Ticket titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** tickets.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer it touches: vertical, NOT a horizontal slice of one layer
- Each slice delivers one or more of the issue's scenarios, and every scenario belongs to exactly one slice
- A completed slice is demoable or verifiable on its own: its scenarios' tests pass
- Each slice is sized to fit in a single fresh context window
- Any prefactoring should be done first, in slices that deliver no scenario

</vertical-slice-rules>

Give each ticket its **blocking edges**: the other tickets that must complete before it can start. A ticket with no blockers can start immediately.

**Wide refactors are the exception to vertical slicing.** A **wide refactor** is one mechanical change (rename a column, retype a shared symbol) whose **blast radius** fans across the whole codebase, so a single edit breaks thousands of call sites at once and no vertical slice can land green. Don't force it into a tracer bullet; sequence it as **expand–contract**. First expand: add the new form beside the old so nothing breaks. Then migrate the call sites over in batches sized by blast radius (per package, per directory), each batch its own ticket blocked by the expand, keeping CI green batch to batch because the old form still exists. Finally contract: delete the old form once no caller remains, in a ticket blocked by every migrate batch.

### 4. Draw the slice map

Write the map as `slice-map.json` in `.scratch/<issue>/` at the project's root, which git ignores, so the user can open it while you iterate. Give it the shape of [the example](assets/slice-map.example.json): the modules, journeys and outside systems the change touches as parts on a grid of three columns and up to four rows, callers on the left and outside systems on the right, each name at most 18 characters; the calls between them as links; and, per slice, the part IDs and `from>to` links it adds. Then draw it:

```sh
node ${CLAUDE_SKILL_DIR}/scripts/draw-slice-map.ts .scratch/<issue>/slice-map.json .scratch/<issue>/slice-map.svg
rsvg-convert -w 1400 .scratch/<issue>/slice-map.svg -o .scratch/<issue>/slice-map.png
```

Look at the PNG and fix anything that overlaps or reads wrongly. Then tell the user where the SVG is, which is sharper than the PNG.

### 5. Quiz the user

Show the map, then the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **Delivers**: the scenarios it delivers, and what the user could see working once it lands
- **Decisions**: each choice about how it's built that its scenarios leave open and a test writer would otherwise guess at, such as a test seam, how an outside tool behaves, or a default, with your recommended answer

Find the facts behind a decision yourself, with a sub-agent reading the code, docs or source. A slice that relies on a tool nobody here has run yet gets a spike ticket that blocks it: a throwaway that tries the tool and records what it finds on the tickets it blocks.

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?
- Are the decisions right?

Redraw the map after each change, and iterate until the user approves the breakdown.

### 6. Publish the tickets

Create each ticket under the issue from [the ticket template](assets/ticket.md), in dependency order (blockers first), so each ticket's blocking edges can reference real tickets.

Describe behaviour in a ticket, not file paths or code, which go stale fast.

### 7. Put the map on the issue

Set each slice's `ticket` to how the tracker refers to it, such as `"#43"`, and redraw. Add the map to the issue's body under a `## Slice map` heading. Keep the rest of the issue as it is, and leave it open.

## Issue tracker

!`${CLAUDE_PROJECT_DIR}/docs/agents/issue-tracker/active.sh`
