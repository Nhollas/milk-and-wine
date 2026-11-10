# Retro: the first playthrough (issue #3, the workflow benchmark)

**Start here:** answer the five [open questions](#open-questions). Each one unblocks one of the [proposals](#proposals).

- **Covers:** `/specify` (4–6 Nov), `/to-tickets` (6 Nov), and three `/foreman` sessions delivering tickets #5, #7, #6, #8 and #9 (6–9 Nov).
- **Evidence:** the session transcripts, the 27 comments you left on the spec draft, PRs #4 and #15–#20, and git history.
- **Caveat:** five tickets, one feature, first run. Ticket #9 was the first to touch an outside tool (Harbor), so it skews every number.

## The short version

Delivery asked you **22** questions. Only **1** was the kind you want: a real judgment call. The other 21 came from three causes:

| Cause | Questions | What would remove them |
| --- | --- | --- |
| The spec or ticket left a decision open | 10 | Settle technical choices before tickets are cut |
| First-run tooling broke | 8 | Mostly fixed already |
| The agent could have decided itself | 3 | A clear bar for when to ask |

The review rounds come from the same place. **The intent judge holds tests to the spec's exact wording**, so every gap in the wording costs a round. In tickets #8 and #9, most extra judge rounds ended with the spec being edited, not the test. 14 spec edits landed inside ticket PRs.

The spec draft took two rounds and 27 comments. Over half of those comments were about **wording you couldn't follow (7)** or **scope you never asked for (8)**.

## Root causes, ranked

Ranked by how much of your time each cost.

### 1. Decisions the spec didn't make got made during delivery, by asking you

- Ticket #9 came back to you 10 times. 7 of those were design choices the spec left open: which config files a trial gets, where the test seam goes, which token fields count, which time counts, where the repository sits.
- You named the cause yourself: _"maybe a sign that we needed to be more explicit in B16"_.
- **Why it happened:** #9 was the first ticket to touch Harbor. The only spike was on `sbx`, not Harbor. Nothing in the process says "an unfamiliar tool gets a spike before tickets are cut", so the unknowns ended up in the test writer's lap.
- The spec also had nothing to say about `bench:run` actually starting trials. The standards reviewer found that gap, and you added B27 mid-ticket.

### 2. The intent judge turns every wording gap into a round

| Ticket | Scenarios            | Judge runs          | Spec edits in the PR |
| ------ | -------------------- | ------------------- | -------------------- |
| #5     | B1, B2, B7 (+B26)    | 7                   | 1                    |
| #7     | B13                  | 4                   | 0                    |
| #6     | B3–B6                | 4 (2 lost to a bug) | 0                    |
| #8     | B8, B9               | 6                   | 2                    |
| #9     | B10, B11, B16 (+B27) | 12                  | ~10                  |

- B10 went through the judge five times. Each round flagged a detail the tests pinned and B10 didn't name: `.gitignore`, the `ISSUE-TRACKER.md` copy, exact paths, and a Given that B8 already owns. Each fix was a spec edit.
- The judge is doing its job. A judge this strict needs a spec this precise, and the spec wasn't.
- **Two checks contradicted each other:** in #8, the standards reviewer wanted B9's expected output written out literally, and the judge called that an added requirement. Both were right by their own rules. Foreman had to stop and ask you.

### 3. A fresh standards reviewer each round finds new things

- Ticket #5 had **5** standards reviews. Three of them raised findings the round before hadn't.
- `deliver` spawns a new reviewer every round. Each one rereads the whole diff, so "review the fixes" turns into "review everything again".
- The bar only showed up in round 5: _"no blocking findings, only three optional"_. Before that, every finding counted as blocking.
- This is the "eager reviewing" you noticed. The rounds were real, but the reviewer never converges, because nothing carries over between rounds.

### 4. First-run tooling failures surfaced as questions

These are mostly fixed already. Listed so the lessons stick.

1. The judge and mutant-writer guards only knew `src/` (fixed: `b11aecf`, `8815b39`).
2. A guard blocked the judge's hand-back, so two judges finished without a verdict. You had to ask _"What's going on with the judge?"_ (fixed: `20a061c`).
3. The subject `workflow-benchmark` didn't match its folder `tools/benchmark`, so the lint rule and `spec:mutants` couldn't find the tests (fixed: PR #15).
4. Twice, a test writer replied with just "Placeholder", and once it left its work uncommitted. **Cause:** it sent `git commit` and its report in the same batch of tool calls, so it wrote the report before it knew the commit had worked. Sending the report ends the agent, so in the B9 case the commit never landed. **Fixed:** see [Outcome](#outcome).
5. **A lesson that wasn't written down:** in #5 you chose "test writer adds a stub so red tests can commit". Foreman suggested adding that to the test writer's rules. Nobody did, and #8 had to work it out again from #5's commits.

### 5. The spec draft was written for an agent, not for you

Your 27 comments on the draft:

| Kind | Count | Examples |
| --- | --- | --- |
| Scope you didn't ask for | 8 | "overkill", "I don't see the need for this", "way too much detail", a decision rule, a 4-hour default |
| Wording you couldn't follow | 7 | "what does this mean?", "I don't understand this", "sounds like a riddle bro" |
| Checking your own understanding | 4 | "Am I right in saying we only care about the hidden tests?" |
| Drift from what you'd already agreed | 3 | "I thought we answered this?", "not even a concept anymore, remove this" |
| Naming | 3 | "reference implementation?", "each setup or each benchmark?" |
| Agreement | 2 | "Yes! this is a real limitation thank you!" |

- **Drift:** the draft kept things the grilling had dropped (the ask-a-question idea, the timeout question). It also said _"Tasks are small"_ after you'd said they should be big enough to carry real complexity. Nothing checks the draft against the decisions before you see it.
- **Invented scope:** B11, B14 and B16 and the decision rule answered questions nobody asked.
- **Internal detail:** `tools/specs`, a list of what to leave out instead of what to include, and "trajectory".
- **Terms:** you rejected seven terms over the session: pipeline, arm, single agent, setup, job, escape, kata/subject. Terms are now proposed before drafting (`9fd3dfa`), which should help.
- In chat you also flagged that the questions felt _"never-ending"_ and options were dumped as pros instead of a recommendation. That's fixed in `c9cd333`. The grilling ran to 22 questions over 5 rounds. About 6 topics overlapped with the earlier `/grill-me` session, but `/specify` was given that session's research doc and mostly went a level deeper. On the question concept, you changed your mind. So the overlap wasn't waste. The drift came later, between the grilling and the draft.

## What you did that added work

Ranked by cost. Each comes with its evidence. Where the process set you up for it, that's said too.

### 1. Merging the spec PR in 4 minutes

- PR #4 was opened at 10:29 and merged at 10:33.
- 80 minutes later, delivery found that the subject `workflow-benchmark` didn't match its folder `tools/benchmark`. That cost a spec PR (#15), a question, and every ticket stacked on top of it.
- You'd agreed the doc, but the PR was the first time the spec existed as a file, next to the code layout. A slower read would likely have caught the mismatch.
- **Process share:** `/specify` doesn't say what to check in the PR that the doc couldn't show.

### 2. Picking Harbor without asking for a spike

- The sandbox spike was on `sbx` (4 Nov). You chose Harbor the next evening: _"Wow, Harbor sounds really good"_, then _"Yeah I think we go with it."_
- Nobody spiked Harbor before ticket #9 was cut. #9 then cost 10 questions, 12 judge runs and about 10 spec edits.
- **Process share:** the agent didn't suggest a spike either. Proposal 1 covers it.

### 3. Dogfooding on a subject the process wasn't built for

- The agents, guards and `spec:mutants` all assumed code under `src/`. The benchmark lives in `tools/`.
- That alone caused 4 of the 8 tooling failures. Ticket #7 had no mutant step at all, because its change was a markdown file.
- A valid choice, since the benchmark is what you needed next. But it means this playthrough measured "the process on unfamiliar ground", not the happy path.

### 4. Answering a question with a question

- Ticket #9, 14:46: asked which config files a trial gets, you replied _"What do you practically think we need"_. On the seam you replied _"I need some thought about this"_.
- Both came back as a second round of questions 10 minutes later, and the seam took two more chat exchanges. You said yourself: _"I take it back then I had a poor understanding!"_
- **Process share:** the questions were dense, and the seam question bundled "use Harbor?" with "where does the test double go?". Still, a short "you pick, I'll check it in the PR" would have saved a round. Proposal 2 makes that the default.

### 5. Changing the process while measuring it

- `deliver` was split out of `foreman` the evening `/specify` started (`51cab4d`). `/specify` itself was edited twice mid-session (`c9cd333`, `9fd3dfa`), and `/to-tickets` once (`9dc4d53`).
- Every fix was right. But the spec was produced by three versions of `/specify`, so this retro can't tell which version caused which comment.
- Next time: note the commit each session ran on, or batch skill fixes until the session ends.

**Not counted against you:** saying _"stop after this ticket"_, the 22-hour gap before merging PRs #16 and #17, and reviewing PR #16 with a question. That's the human role working as intended.

## The numbers

| Ticket | Agent spawns | Questions to you | Elapsed                      |
| ------ | ------------ | ---------------- | ---------------------------- |
| #5     | 27           | 7                | ~1h50 (incl. waiting on you) |
| #7     | 13           | 0                | ~7 min                       |
| #6     | 12           | 2                | ~17 min                      |
| #8     | 16           | 3                | ~24 min                      |
| #9     | 36           | 10               | ~1h30                        |

**#7 is what you want:** 0 questions, 7 minutes, mutants skipped and noted. It had one scenario and no new tooling.

## Proposals

Ranked by how many questions each would have removed. None is applied: each waits on your answer to the matching open question. Times are for an agent doing the edit.

1. **Settle technical unknowns before tickets are cut.** In `/to-tickets`, flag any slice that touches an unfamiliar tool, and spike it first. Add a **Decisions** section to the ticket template, so seams, configs and defaults travel with the ticket. Would have removed ~7 of #9's 10 questions. _About 30 min._
2. **Give `deliver` a bar for asking.** Decide anything with a clear recommended answer, and list it in the PR under "Decisions to check". Ask only when the answer changes what a scenario means. This moves questions from blocking you to async review. Would have removed the 3 cases the agent could have decided, and turned most of the spec-gap questions into PR notes. _About 20 min._
3. **Let spec rewording land in the ticket PR, officially.** You said _"Just reword in this PR bro"_, and PRs #16, #19 and #20 already did it. AGENTS.md still says a spec change gets its own PR. Rule: rewording that matches a decision already made goes in the ticket PR, while a new behaviour gets its own. _About 10 min._
4. **Keep one standards reviewer per ticket, and give findings a severity.** Resume the same reviewer with `SendMessage` instead of spawning a new one, and split its findings into _must_ and _optional_. Only _must_ loops back. Also settle the rule conflict between the judge and the reviewer: say in CODING-STANDARDS whether a test spells out expected output when the scenario doesn't fix its order. _About 30 min._
5. **Make `/specify` check its own draft before you see it.** Before sharing, a subagent checks three things: every scenario traces to a grilling decision, every decision shows up, and nothing names internal paths. Your 27 comments make a ready-made eval set for that check. _About 1 hour, plus evals._

Smaller, any time:

- Add the stub rule to the test writer (_5 min_).

## Outcome

Your answers on 9 Nov, and what changed.

1. **The ask bar: agreed (proposal 2).** `deliver` now makes any call it can recommend an answer to, and lists it under **Decisions to check** in the PR. A choice that's hard to reverse or binds later tickets also gets an ADR on the ticket's branch. It stops to ask only when every answer would change what a scenario means.
2. **Design decisions live in the ticket: agreed (proposal 1).** The spec rules now say to specify a choice only if an observer could tell the difference. Everything else goes in a new **Decisions** section of the ticket. `/to-tickets` proposes those decisions in its quiz, and gives a slice that relies on an untried tool a spike ticket that blocks it.
3. **Spec edits in ticket PRs: agreed (proposal 3).** The point of a spec is alignment, not being right first time. AGENTS.md now lets a spec change that delivery finds land in the ticket's PR, and the PR lists each one under **Spec changes** with its reason. Count them as feedback for `/specify`, not as failures.
4. **Double grilling: no change.** See root cause 5.
5. **"Placeholder": fixed.** The test writer and implementer now reply only once their commit has worked. `deliver` treats a reply that doesn't say what it did as a failure and checks the branch.

Still open: proposal 4 (one reviewer per ticket), proposal 5 (`/specify` checks its own draft), and adding the stub rule to the test writer.
