---
name: to-tickets
description: Break an issue into tracer-bullet tickets from a slice map, published as its sub-issues with native blocking links.
argument-hint: <issue, such as #42>
disable-model-invocation: true
---

# To Tickets

Break an issue into a set of **tickets**: tracer-bullet vertical slices, each declaring the tickets that **block** it.

Use the user's request: $ARGUMENTS

## Process

### 1. Gather context

Fetch the issue with `gh issue view <n> --comments` and read its full body and comments, then each spec it points at on the latest `main`. Each scenario it proposes is on `main` with a `test.todo`; if its spec PR is still open, ask the user to merge it first.

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

Write the map as JSON in your scratchpad, in the shape of [the example](assets/slice-map.example.json): the modules, journeys and outside systems the change touches as parts on a grid of three columns and up to four rows, callers on the left and outside systems on the right, each name at most 18 characters; the calls between them as links; and, per slice, the part IDs and `from>to` links it adds. Then draw it:

```sh
node .claude/skills/to-tickets/scripts/draw-slice-map.ts <map.json> <map.svg>
rsvg-convert -w 1400 <map.svg> -o <map.png>
```

Look at the PNG and fix anything that overlaps or reads wrongly.

### 5. Quiz the user

Show the map, then the proposed breakdown as a numbered list. For each ticket, show:

- **Title**: short descriptive name
- **Blocked by**: which other tickets (if any) must complete first
- **Delivers**: the scenarios it delivers, and what the user could see working once it lands

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the blocking edges correct: does each ticket only depend on tickets that genuinely gate it?
- Should any tickets be merged or split further?

Redraw the map after each change, and iterate until the user approves the breakdown.

### 6. Publish the tickets

Create each ticket as a sub-issue from [the ticket template](assets/ticket.md), in dependency order (blockers first), so each ticket's blocking edges can reference real numbers:

```sh
gh issue create --title <title> --body-file <body> --parent <n> --blocked-by <numbers>
```

Avoid specific file paths or code snippets: they go stale fast.

### 7. Put the map on the issue

Set each slice's `ticket` to its number, such as `"#43"`, and redraw. Append a `## Slice map` section to the issue's body holding `![Slice map](<map.png>)`, then run `gh issue edit <n> --body-file <body> --attach <map.png>`, which uploads the image in place of the local path. Keep the rest of the issue as it is, and leave it open.
