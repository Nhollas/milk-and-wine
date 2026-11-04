# Benchmark sandbox spike

Spike notes, November 2026. The question: can the workflow benchmark run each arm headless, in its own Docker sandbox, on a Claude subscription? This checked only the unknowns that could sink that plan. It delivered nothing.

Run on macOS 15.7 (Apple silicon), `sbx` 0.51.0, Claude Code 2.1.318, at commit `51cab4d`.

## Short answer

All five checks pass. The plan holds, with two fixes and three things the benchmark's sandbox has to set up.

| # | Check | Result |
| --- | --- | --- |
| 1 | Subscription login works headless | Passes. One `/login` in any sandbox stores the token on the host, and every new sandbox's `claude -p` uses it |
| 2 | `claude -p` spawns the repo's custom subagents | Passes, for a `.claude/agents/` agent and the intent judge's plugin agent |
| 3 | Guards fire and resolve paths in a clone-mode sandbox | Passes. Both guards blocked and allowed exactly what they should |
| 4 | `--output-format json` gives tokens and time, subagents included | Passes. `modelUsage` counts each subagent's model, and `subagent_stats` counts spawns by type |
| 5 | Two sandboxes run at once | Passes for two short runs. Not a rate-limit test |

## What it found

- **Login.** A fresh sandbox's `claude -p` replies "Not logged in · Please run /login". After one interactive `/login` in one sandbox, `sbx secret ls` shows a global `anthropic (oauth configured)` secret, and a second, new sandbox ran headless with no login.
- **Subagents.** One headless run spawned a `mutant-writer` and an `intent-judge:intent-judge`. The judge loads as the `intent-judge@skills-dir` plugin, so it needs no install.
- **Guards.** In the sandbox:
  - The mutant writer was blocked from `src/loans/loans.service.test.ts` ("never reads tests") and from `tests/support/`, and allowed `src/loans/loans-app.ts`.
  - The judge was blocked from `src/loans/loans-app.ts` ("never reads the code under test") and allowed the test and support files.
- **Usage.** A run on Haiku that spawned a Sonnet subagent reported tokens under both models in `modelUsage`. The output also has `duration_ms`, `num_turns` and `total_cost_usd`. On a subscription `total_cost_usd` is the list price, not a charge.
- **Skills.** `/foreman` runs headless, and `deliver` loads through the Skill tool from inside a session.

## Fixed

- **`ISSUE_TRACKER` in the project settings beat the shell's.** In the sandbox, `ISSUE_TRACKER=local claude -p "/foreman …"` still got the github instructions, because `env` in `.claude/settings.json` won. The variable now lives only in the shell, and `active.sh` falls back to `github`. Rerun in the sandbox, foreman followed the local kind.

## The benchmark's sandbox has to set up

- **Node and pnpm.** The default image has neither, and every guard is a Node script. The spike installed Node 24.22.2 from nodejs.org (checksum verified) and pnpm 12.3.4, and the repo's tests passed: 128, with 5 todo. A template image should carry both, so runs don't spend time installing.
- **The issue.** `.issues/` is gitignored, so a clone-mode sandbox never has it. The harness copies the kata's issue in with `sbx cp`.
- **No GitHub.** `sbx` puts a `GH_TOKEN` in each sandbox, which GitHub rejected here (401). Nothing should reach GitHub, so the harness runs with `ISSUE_TRACKER=local`. Whether to strip the token as well is still open.

## Not checked

- **The rate limit under load.** Two short runs proved nothing about two full pipeline runs at once. The calibration batch will show it.
- **How long the login lasts.** `claude -p` on the host warned the sign-in "can end at any time" by the next day, and suggested `claude setup-token` for unattended jobs. Untested in a sandbox.
- **A full `deliver` run.** Every step's parts work headless, but the five steps haven't run end to end.
