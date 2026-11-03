---
name: to-tickets
description: Slice a change spec into tickets, agree them with the user from a slice map, then create them as sub-issues with blocking links.
argument-hint: <change spec issue, such as #42>
disable-model-invocation: true
---

Adapted from Matt Pocock's [to-tickets skill](https://github.com/mattpocock/skills), under the MIT licence in [LICENSE](LICENSE).

Use the user's request: $ARGUMENTS

1. **Load the change spec.** Read the issue with `gh issue view <n> --comments`, then every spec it links, on the latest `main`. Each scenario it proposes must be in its spec on `main` with a `test.todo` and no active test. If the spec PR hasn't merged, stop and ask the user to merge it.
2. **Read what it touches.** Read enough of the code to know which modules, journeys and outside systems each scenario reaches, and what prefactoring would make the change easy. Use the words in [the glossary](../../../GLOSSARY.md), and follow the ADRs in `docs/adr/` for the area.
3. **Draft vertical slices.** Each slice is one ticket and follows these rules.
   - It delivers one or more of the change spec's scenarios end to end, through every part they touch. Once it lands, its scenarios' tests pass.
   - Every scenario the change spec proposes belongs to exactly one slice.
   - It fits one fresh session: a test writer, the intent judge, an implementer, the mutant writer and a standards reviewer each work on it in turn.
   - Prefactoring comes first, in slices that deliver no scenario and leave behaviour unchanged.
   - It's blocked only by slices whose work it needs. Foreman already runs slices that edit the same files one at a time.
   - A wide refactor, one mechanical change that breaks every caller at once, is the exception. Sequence it as expand, migrate in batches, then contract, each its own slice.
4. **Draw the slice map.** Write the map as JSON in your scratchpad, in the shape of [the example](assets/slice-map.example.json). Its parts are the modules, journeys and outside systems the change touches, on a grid of three columns and up to four rows, with callers on the left and outside systems on the right. Keep each name to 18 characters. Its links are the calls between parts, and each slice lists the part IDs and `from>to` links it adds. Then run:

   ```sh
   node .claude/skills/to-tickets/scripts/draw-slice-map.ts <map.json> <map.svg>
   rsvg-convert -w 1400 <map.svg> -o <map.png>
   ```

   Look at the PNG yourself and fix anything that overlaps or reads wrongly before showing it.

5. **Agree the slices.** Show the user the map, and list each slice with its title, the scenarios it delivers and the slices that block it. Ask whether the size is right, whether each blocking edge is real, and what they'd merge, split or reorder. For each slice, ask what they could see working once it lands; a slice with no answer is a layer, not a slice. Redraw after each change, and create nothing until the user approves.
6. **Create the tickets.** Check `gh --version` is 2.94 or later, for `--parent`, `--blocked-by` and `--attach`, and stop if it isn't. Create each ticket from [the ticket template](assets/ticket.md), blockers first so their numbers exist, with `gh issue create --title <slice title> --body-file <body> --parent <n> --blocked-by <numbers>`. Leave file paths and line numbers out of the body; they go stale before the ticket is picked up.
7. **Put the map on the change spec.** Set each slice's `ticket` to its issue number, such as `"#43"`, and redraw. Fill the change spec's Tickets section with each ticket in landing order and the map as `![Slice map](<map.png>)`, then run `gh issue edit <n> --body-file <body> --attach <map.png>`, which uploads the image in place of the local path. Change nothing else on the change spec, and don't close it.
8. **Hand over.** Give the user the tickets' links, and say the next step is `/foreman #<n>`.
