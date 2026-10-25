# Intent

Why this repository exists. Read this before changing the process, so the changes stay true to it.

"Spec-driven development" has come to mean almost anything. A thread by Matt Pocock asking people to define it surfaced a couple of replies that described what I'd already drifted into on another project: specs that last and describe what the system does, and short-lived specs that only exist to get a piece of work delivered. That was reassuring, but I wasn't sure I was reading them right, and I'd never been happy with what the lasting specs should actually look like.

I also knew what I didn't want. Specs aren't a source of truth to regenerate code from, and they aren't long documents written for agents. Their job is to keep people and agents agreed on behaviour, so if a person can't read one comfortably, it has failed.

Agents have made code cheap to write. What's expensive now is agreeing what to build and trusting what was built. So this is after three things:

1. **Pace.** Changes get from intent to merged faster.
2. **Clarity and alignment.** People and agents agree on behaviour before any code exists, and the intent survives every handoff.
3. **Confidence at review.** A reviewer can trust that a change is faithful to the intent without reading every line to find out.

Each part of the process has to earn its place against one of these. Problems we don't have yet, like changes that span several repositories, wait until these are proven.

This repository is where I work that out from first principles, away from one project's habits, using a deliberately small app so the process is what you look at. It's a hypothesis I'm testing, and a reference I hope to reuse, not a finished standard.

Nothing here is settled. The specs, the tooling and the process are all open to challenge, including the parts that already work. A question about them is a question, not a decision.

What I want to come away with is the understanding, written down: why each part of the process exists, and what it was weighed against. The app and its tooling are how I test that understanding. They aren't the point of it.
