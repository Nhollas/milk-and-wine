---
name: grill
description: Question the user a round at a time until every decision in a plan, idea or behaviour is settled. Use when the user wants their thinking stress-tested, says "grill me", or another skill needs a decision tree worked through with them.
---

Adapted from Matt Pocock's [grilling skill](https://github.com/mattpocock/skills), under the MIT licence in [LICENSE](LICENSE).

Question the user until you both understand the same thing. Map it as a **decision tree**: each decision branches into the decisions that depend on it.

1. **Ask in rounds.** The **frontier** is every open decision whose prerequisites are settled, so you can ask it without guessing at an answer you haven't heard. Ask the whole frontier in one round, numbered, each with your recommended answer, then wait. A question that depends on another one in the same round waits for a later round.
2. **Look up facts yourself.** Facts are yours to find; decisions are the user's. When a question needs a fact from the code, the specs or a tool, send a subagent to find it rather than asking. Only the questions that depend on that fact wait for it; ask the rest now.
3. **Recompute after each answer.** Each answer settles decisions and opens the ones that hung off them. Ask the new frontier as the next round.
4. **Stop when the frontier is empty.** Every branch has been visited and nothing is assumed. List what was settled, one line each, and don't act on it until the user confirms the list.

Format a round like this:

```text
❓ **Q1** - **<question title>**: <the question, with its options if it has them>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <the question>

➡️ <your recommended answer>
```
