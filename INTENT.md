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

## How a reviewer trusts a change

Two checks, both for confidence at review. They started as trials and are now part of the approach. Each is held to targets it has to keep meeting. A check that falls short gets improved first, and is dropped only if it can't be brought back up to them.

Each behaviour of the app is written in a spec as acceptance criteria, in the form given a starting situation, when something happens, then what should result. Each test says which criteria it proves.

### Intent judge

Does each test check what its acceptance criteria say? An agent reads each test beside the criteria it claims to prove. It reports anything the criteria ask for that the test doesn't check, anything the test checks that the criteria don't ask for, and anything the test expects that contradicts them.

The judge has to meet these targets.

| Measure                                                                 | Target          |
| ----------------------------------------------------------------------- | --------------- |
| Gaps I deliberately planted in example tests that it finds              | All of them     |
| Problems it reports on the repository's own tests that I agree are real | At least 4 in 5 |
| Real problems it reports every time it runs                             | All of them     |

### Spec mutants

Would the tests catch a bug? For each spec, an agent writes small, deliberate bugs into the code, each meant to break one thing the acceptance criteria ask for. A bug the tests miss means they're too weak to protect that behaviour. Only tests the intent judge has already passed count, so a miss points at a weak test rather than one that checks the wrong thing.

The mutants have to meet these targets.

| Measure                                         | Target                                 |
| ----------------------------------------------- | -------------------------------------- |
| Missed bugs that show a real weakness in a test | Most of them                           |
| Bugs a refactor of the code leaves out of date  | Fewer than half                        |
| Time spent keeping the bugs up to date          | Less than reading the tests would take |
