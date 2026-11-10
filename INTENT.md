# Intent

"Spec-driven development" means very different things to different people in the engineering community. A thread by Matt Pocock asking people to define it surfaced a couple of replies that described what I'd already explored on another project. They split specs into ones that last and describe what the system does, and short-lived ones that only exist to get a piece of work delivered. What I'd never settled was what the lasting specs should actually look like.

I did know I didn't want specs to be a source of truth to regenerate code from, or long documents written for agents. I want them to keep people and agents agreed on behaviour, so a spec a person can't read comfortably isn't doing its job.

Agents have made code cheap to write. What's expensive now is agreeing what to build and trusting what was built. So every idea tried in this repository aims at three things:

1. **Pace.** Changes get from intent to shipped faster.
2. **Clarity and alignment.** People and agents agree on behaviour before any code exists, and that agreement still holds when someone else builds it.
3. **Confidence at review.** A reviewer can trust that a change is faithful to the intent without reading every line to find out.

This isn't a search for one workflow that suits every team. Each idea is tried on its own, and kept only if it helps with one of these three.

To try the ideas out, the repository has a small playground app. It's a library service where members borrow books, get reminded when they're late, and bring them back. Keeping it small means the ideas, not the app, are what you look at. The whole thing is an experiment, not a finished standard.

What I want to come away with is a written understanding of why each idea is kept, and what it was weighed against. The app and its tooling are how I test that understanding. They aren't the point of it.

## Review checks

Two checks, both for confidence at review. Each must keep meeting its targets, and one that falls short is improved before it's dropped.

Each behaviour of the app is written in a spec as acceptance criteria, in the form given a starting situation, when something happens, then what should result. Each test says which criteria it proves.

### Intent judge

Does each test check what its acceptance criteria say? [Spec-driven development](docs/spec-driven-development.md#8-checking-a-test-proves-its-scenario) shows how it works alongside the spec mutants. The judge has to meet these targets.

| Measure                                                                 | Target          |
| ----------------------------------------------------------------------- | --------------- |
| Gaps I deliberately planted in example tests that it finds              | All of them     |
| Problems it reports on the repository's own tests that I agree are real | At least 4 in 5 |
| Real problems it reports every time it runs                             | All of them     |

### Spec mutants

Would the tests catch a bug? Only tests the intent judge has already passed count, so a bug the tests miss points at a test too weak to protect its behaviour. The mutants have to meet these targets.

| Measure                                         | Target                                 |
| ----------------------------------------------- | -------------------------------------- |
| Missed bugs that show a real weakness in a test | Most of them                           |
| Bugs a refactor of the code leaves out of date  | Fewer than half                        |
| Time spent keeping the bugs up to date          | Less than reading the tests would take |

## Attention

The review checks say whether a change's tests can be trusted. They don't say what the workflow costs me. Each playthrough's [retro](docs/retros/) counts that.

| Measure, per ticket                    | Target                                   |
| -------------------------------------- | ---------------------------------------- |
| Questions I was asked                  | Only real judgment calls                 |
| Rounds a check sent the work back      | Falling from one playthrough to the next |
| Spec edits made inside the ticket's PR | Falling from one playthrough to the next |

## What was cut

The workflow once delivered each ticket through five agents, with a foreman taking tickets in turn, and a benchmark was being built to compare it with Claude Code left to itself. The benchmark's first trial settled more than it was meant to: given a spec and two tickets, a plain session built the feature and its tests in under two minutes and passed every hidden test. Writing the code was never the expensive part, so the test writer, implementer, standards reviewer, foreman and the benchmark were cut. What's kept is what the opening of this page says is expensive: agreeing the behaviour, and trusting what was built.

That trial's task was easy, and its starter code showed the agent every pattern it needed, so it doesn't prove a plain session is enough on harder work. It was reason enough to stop building on parts with no evidence behind them.
