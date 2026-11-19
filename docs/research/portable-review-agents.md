# Portable review agents

Research notes, November 2026. The question: how do people package local coding agents so that an agent's definition, its guardrails and its tooling live together and can be installed in another repository? This is weighed against the two review checks here, the [intent judge](../../.claude/agents/intent-judge/intent-judge.md) and the [mutant writer](../../.claude/agents/mutant-writer/mutant-writer.md), whose guards, tools and evals are spread across `.claude/agents/`, `.claude/settings.json`, `tools/` and `evals/`.

Each point is marked **Documented** (the vendor's own docs or source) or **Practice** (what people do instead, with no vendor guarantee). Read against Claude Code 2.1.3xx and Harbor 0.25.0.

## Short answer

- **Only Claude Code and Cursor package agents, hooks and scripts as one installable unit.** Both call it a plugin. Codex plugins hold skills, MCP servers and, on desktop only, hooks, but not agents. Aider and OpenHands have nothing like it.
- **A Claude Code plugin agent can't carry its own guard.** Plugins ignore `hooks` in agent frontmatter "for security reasons". The guard has to be a plugin-wide hook that checks `agent_type` itself. This is why the earlier plugin moved the judge's guard into `hooks/hooks.json`.
- **The current setup probably doesn't run the judge's guard in Harbor.** A project agent's frontmatter hooks run only in a folder the user has trusted, and a `claude -p` run doesn't count as trusted. Harbor runs `claude --print` with a fresh config folder.
- **No tool gives an agent a filtered view of the repository.** The nearest are Aider's `.aiderignore` and `--subtree-only`, Cursor's `.cursorignore`, and read-deny rules in Claude Code and Codex. All of them are settings for the whole session, not for one agent. Everyone else hands the agent a filtered copy: a container, a mount or a worktree. The Harbor tasks here already do that.
- **Per-repository settings layer the same way everywhere:** managed, then command line, then project, then user. A repository can't set a plugin's options in Claude Code, but it can set `env`, and `env` reaches hook processes.

| Tool | Agent, guard and scripts in one package | Per-agent guard | Filtered workspace |
| --- | --- | --- | --- |
| Claude Code | Plugin: agents, skills, hooks, MCP, `bin/`, scripts | Frontmatter hooks on project agents only; plugin hooks filter on `agent_type` | No. Read-deny rules, sandbox `denyRead` for Bash, `--restricted` |
| Codex CLI | Plugin: skills, MCP; hooks on desktop only. Agents are separate TOML files | No. Tool hooks have no agent field | No. Permission profiles with `deny` (beta) |
| Cursor | Plugin: rules, skills, agents, commands, MCP, hooks | No. `readonly` only | `.cursorignore`, `beforeReadFile` hook |
| Aider | No | No agents | `.aiderignore`, `--subtree-only` |
| OpenHands | No. Skills only | No | Mount only what it should see |

## 1. Packaging and distribution

### Claude Code plugins (Documented)

- **What a plugin holds.** Skills, commands, agents, hooks, MCP servers, LSP servers, output styles, workflows, monitors, and a `bin/` folder put on the Bash tool's `PATH`. Any other folder, such as `scripts/`, is just files the hooks call by path ([manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference), [components](https://code.claude.com/docs/en/plugins/components)).
- **`${CLAUDE_PLUGIN_ROOT}`** is the installed version's folder. It changes on every update, so nothing should be written there. It's substituted in hook commands, MCP and LSP config, and skill, command and agent bodies. Hook processes also get it as an environment variable; Bash commands don't ([manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference#environment-variables)).
- **`${CLAUDE_PLUGIN_DATA}`** is `~/.claude/plugins/data/<id>/`. It survives updates and is deleted on the last uninstall. It's meant for `node_modules`, caches and generated code ([manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference#environment-variables)).
- **Only the plugin's own files travel.** An installed plugin is copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. A script that reads `../shared` won't find it, and a component path that leaves the plugin folder is rejected ([loading](https://code.claude.com/docs/en/plugins/loading#in-place-and-copied-plugins)).
- **Dependencies.** On install, Claude Code runs `npm` or `bun` for a plugin that has a `package.json` and an npm or Bun lockfile, with scripts off and a 60-second limit. It skips `pnpm-lock.yaml` ([loading](https://code.claude.com/docs/en/plugins/loading#nodejs-package-dependencies)).
- **Marketplaces.** A marketplace is a `.claude-plugin/marketplace.json` that lists plugins and where to fetch each: a relative path, `github`, `url`, `git-subdir`, `npm`, `archive` or `command` ([create a marketplace](https://code.claude.com/docs/en/plugin-marketplaces), [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference)). One repository can be the marketplace and hold the plugin.
- **Pinning.** `github`, `url` and `git-subdir` sources take `ref` and a full 40-character `sha`. A marketplace source can be pinned to a commit with `ref`. A `version` in `plugin.json` holds users on that version until it changes. Without one, the version is the commit SHA ([marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference#plugin-sources), [loading](https://code.claude.com/docs/en/plugins/loading#how-claude-code-computes-the-version)).
- **How a repository installs one.** `.claude/settings.json` declares the marketplace under `extraKnownMarketplaces` and turns the plugin on under `enabledPlugins`. That doesn't install it: each contributor runs `claude plugin install <name>@<marketplace> --scope project` once. Marketplaces in project settings apply only after the folder is trusted, and in `-p` runs only in a folder trusted before ([org](https://code.claude.com/docs/en/plugins/org#require-plugins-per-repository)).
- **Loading without installing.** `--plugin-dir`, `CLAUDE_CODE_PLUGIN_DIRS` and the Agent SDK's `plugins` option load a folder for one session. Images and CI can be seeded with `CLAUDE_CODE_PLUGIN_SEED_DIR`, but the plugin must still be turned on in `enabledPlugins` ([loading](https://code.claude.com/docs/en/plugins/loading#find-where-a-plugin-came-from), [env vars](https://code.claude.com/docs/en/env-vars), [org](https://code.claude.com/docs/en/plugins/org#seed-containers-and-ci)).
- **Plugins in `.claude/skills/`** load as `<name>@skills-dir` with no install. They need the same trust as project allow rules: "Trusting a parent folder or running with `-p` isn't enough" ([loading](https://code.claude.com/docs/en/plugins/loading#trust-check-and-component-limits-for-repository-plugins)). That's the form the earlier intent judge plugin took.
- **Plugin agents ignore frontmatter hooks.** "For security reasons, plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields." The docs say to ship hooks in `hooks/hooks.json` instead ([sub-agents](https://code.claude.com/docs/en/sub-agents), [components](https://code.claude.com/docs/en/plugins/components#frontmatter-fields-in-plugin-agents)).
- **Plugin hooks fire for the whole session.** Claude Code registers them when it loads the plugin, not when one of its agents runs. They also fire inside subagents, with `agent_id` and `agent_type` in the input. `agent_type` is also set when the session runs with `--agent` ([components](https://code.claude.com/docs/en/plugins/components#when-plugin-hooks-fire), [hooks](https://code.claude.com/docs/en/hooks)). A PreToolUse matcher matches the tool name, so the script has to check `agent_type` itself. Only SubagentStart and SubagentStop match on agent type ([hooks](https://code.claude.com/docs/en/hooks#subagentstop)).
- **Plugin options are per user.** `userConfig` values are stored in `pluginConfigs`, which Claude Code reads only from user and managed settings, "because … a cloned repository must not be able to supply them" ([settings reference](https://code.claude.com/docs/en/settings-reference#pluginconfigs)). A repository can't use them to set its own globs.
- **A vendor example.** Anthropic's `security-guidance` plugin ships `hooks/hooks.json`, the Python scripts it calls through `${CLAUDE_PLUGIN_ROOT}`, and their tests in one folder ([claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/security-guidance)).

### Other tools

- **Codex (Documented).** A plugin has a root `plugin.json` and can hold `skills/`, an `mcp.json` and lifecycle hooks, but hooks only for "manually installed Codex desktop plugins". Repo marketplaces live at `.agents/plugins/marketplace.json`, and git entries pin with `ref` or `sha`. The build page doesn't list agents as a component ([build plugins](https://developers.openai.com/codex/plugins/build/)). Custom agents are TOML files in `.codex/agents/` or `~/.codex/agents/` ([subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)).
- **Cursor (Documented).** "Plugins package rules, skills, agents, commands, MCP servers, and hooks". A plugin has a `.cursor-plugin/plugin.json`. Team marketplaces are imported from a repository, on Teams and Enterprise plans. The docs describe no version pinning ([plugins](https://cursor.com/docs/plugins)). Cursor also reads agents from `.claude/agents/` and `.codex/agents/` ([subagents](https://cursor.com/docs/agent/subagents)).
- **Aider (Documented).** No packaging. Config comes from `.aider.conf.yml` in the home folder, the git root and the current folder, and "Files loaded last will take priority" ([config](https://aider.chat/docs/config/aider_conf.html)).
- **OpenHands (Documented).** Skills in `.agents/skills/`, which "follows the Agent Skills standard and makes skills portable across compatible agent tools" ([skills](https://docs.openhands.dev/overview/skills.md)).
- **Agent Skills (Documented).** A skill is a folder with a `SKILL.md` and optional `scripts/`. Its only guardrail field is `allowed-tools`, marked experimental ([specification](https://agentskills.io/specification)). A skill can carry a script, but not an agent or a guard.
- **Practice.** One large community repository writes each agent once in Markdown and generates it for Claude Code, Codex, Cursor and others ([wshobson/agents](https://github.com/wshobson/agents)). That buys reach across tools, not guards: none of the other tools has a per-agent hook to generate into.

### What limits reuse

- A plugin carries only its own folder, so the tools it calls must live inside it.
- Its guard can't be per agent. It's one hook that dispatches on `agent_type`.
- Its options can't be set per repository.
- A repository can declare and turn on a plugin, but each contributor still installs it once.

## 2. Guardrails

### Claude Code (Documented)

- **PreToolUse hooks** run before permission rules. Exit code 2 blocks the call even if an allow rule would let it through. A deny rule still blocks when a hook returns `allow` ([permissions](https://code.claude.com/docs/en/permissions#precedence-among-rules-hooks-and-mods)). A hook that times out doesn't block unless it sets `onFailure: block` ([hooks](https://code.claude.com/docs/en/hooks)).
- **Trust decides which hooks run.** In a `-p` or SDK session, hooks from settings files run in a folder never trusted. Frontmatter hooks in a project agent don't: "Until you trust the folder, the subagent still runs, but Claude Code skips its frontmatter hooks", and "a `-p` session doesn't count as trusted". The same applies when the agent is the main session through `--agent` or the `agent` setting. Hooks in `~/.claude/agents/` and in `--agents` definitions run without trust ([sub-agents](https://code.claude.com/docs/en/sub-agents#hooks-in-subagent-frontmatter), [permissions](https://code.claude.com/docs/en/permissions#what-runs-before-you-trust-a-folder)). A folder can be trusted by hand with `projects["<path>"].hasTrustDialogAccepted` in `~/.claude.json`.
- **Read and Edit deny rules** use gitignore patterns. They cover the file tools, best effort for Grep and Glob, and Bash commands Claude Code recognises, such as `cat`. They miss `grep -r` from a parent folder and scripts that open files themselves ([permissions](https://code.claude.com/docs/en/permissions)). They apply to every agent in the session; subagents inherit the parent's rules ([sub-agents](https://code.claude.com/docs/en/sub-agents)).
- **The sandbox** wraps Bash, PowerShell and Monitor commands with Seatbelt on macOS and bubblewrap on Linux. File tools, MCP servers and hooks run outside it. "A `denyRead` entry doesn't stop the Read tool" ([sandboxing](https://code.claude.com/docs/en/sandboxing)).
- **`--restricted`** is for evaluation harnesses. It removes tools that run code, confines file tools to the working folders, and loads only managed settings and `--settings` ([CLI reference](https://code.claude.com/docs/en/cli-reference)).
- **Worktrees** isolate edits, not reads. `isolation: worktree` gives a subagent a fresh checkout of tracked files, and a `WorktreeCreate` hook can replace how the checkout is made ([worktrees](https://code.claude.com/docs/en/worktrees)).
- **Dev containers.** Anthropic publishes a feature and a reference container with an egress firewall. With `--dangerously-skip-permissions`, a container doesn't stop a project "exfiltrating anything accessible inside the container" ([devcontainer](https://code.claude.com/docs/en/devcontainer)).
- **sandbox-runtime (`srt`)** applies the same filesystem and network limits to any process, `claude` included. It's a beta research preview, and a `denyRead` glob it can't use "leaves every file it matches readable" ([sandbox-runtime](https://github.com/anthropic-experimental/sandbox-runtime)).

### Other tools (Documented)

- **Codex.** Sandbox modes are `read-only`, `workspace-write` and `danger-full-access`, with `writable_roots` and `network_access` ([config reference](https://learn.chatgpt.com/docs/config-file/config-reference)). It uses Seatbelt on macOS and `bwrap` with `seccomp` on Linux. Inside a container you meant as the boundary, it runs with `danger-full-access` ([security](https://learn.chatgpt.com/docs/agent-approvals-security)). Permission profiles can `deny` paths, but they're beta and "govern sandboxed commands" ([permissions](https://learn.chatgpt.com/docs/permissions)). PreToolUse covers Bash, `apply_patch` and MCP. Its input has no agent field, and the docs call tool hooks "a useful guardrail, not a complete enforcement boundary" ([hooks](https://learn.chatgpt.com/docs/hooks)). A custom agent can't set its own `sandbox_mode`: "Subagents inherit your current sandbox policy" ([subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)).
- **Cursor.** `preToolUse` covers every tool, and `beforeReadFile` can block a read before the model sees it. Hooks live in project, user, team and enterprise files, and plugins can add them. Subagent hooks match by type only ([hooks](https://cursor.com/docs/agent/hooks)). A subagent's only control is `readonly` ([subagents](https://cursor.com/docs/agent/subagents)).
- **Docker Sandboxes.** A microVM per agent, with the workspace mounted directly or, in clone mode, mounted read-only and cloned inside ([architecture](https://docs.docker.com/ai/sandboxes/architecture/)). The [benchmark sandbox spike](benchmark-sandbox-spike.md) ran both guards in clone mode.

### A filtered workspace

- **Documented, per session:**
  - Aider: `.aiderignore` and `--subtree-only` ([options](https://aider.chat/docs/config/options.html)).
  - Cursor: `.cursorignore` blocks the agent but not its terminal or MCP tools ([ignore files](https://cursor.com/docs/context/ignore-files)).
  - Claude Code: Read deny rules ([permissions](https://code.claude.com/docs/en/permissions)).
  - Codex: `deny` in a permission profile ([permissions](https://learn.chatgpt.com/docs/permissions)).
- **Documented, per agent:** nothing.
- **Practice:** build a copy holding only what the agent should see, and run the agent there.
  - Mount only those paths: OpenHands' `SANDBOX_VOLUMES` ([docker](https://docs.openhands.dev/openhands/usage/sandboxes/docker.md)), a dev container's `mounts` ([spec](https://containers.dev/implementors/json_reference/)), a Harbor task's `environment/`.
  - Or a `WorktreeCreate` hook that builds the filtered tree.
  - Or a guard hook per tool call, which is what this repository does.
- **Why the copy wins.** A copy is the only one that holds for Bash, scripts and any tool a vendor adds later. Its cost is building the copy for every run.

## 3. Context management

### Isolation (Documented)

- **Subagents.** A subagent "starts with a fresh, isolated context window" and gets its own prompt, not Claude Code's system prompt. It does load CLAUDE.md unless `omitClaudeMd` is set ([sub-agents](https://code.claude.com/docs/en/sub-agents)).
- **One process per agent.** `claude -p --agent <name>` runs a whole session as the agent, so its prompt replaces the default one ([sub-agents](https://code.claude.com/docs/en/sub-agents)). A plugin agent can be named with its scope, such as `my-plugin:security-reviewer`.
- **CLI-defined agents.** `--agents` defines agents in JSON and accepts `hooks`, which run without the trust step ([CLI reference](https://code.claude.com/docs/en/cli-reference), [sub-agents](https://code.claude.com/docs/en/sub-agents#hooks-in-subagent-frontmatter)).
- **Agent SDK.** The SDK's `AgentDefinition` has no `hooks` field ([SDK subagents](https://code.claude.com/docs/en/agent-sdk/subagents)). A guard set for the whole query would have to check `agent_type` in its input, as a plugin hook does ([hooks](https://code.claude.com/docs/en/hooks)).
- **Codex.** Subagents are configured under `[agents]`, and one `config_file` layer can be applied per role ([subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents.md)).

### Layered configuration (Documented)

- **Claude Code.**
  - Precedence runs managed, then `--settings`, then `.claude/settings.local.json`, then `.claude/settings.json`, then user settings. Lists such as `permissions.allow` merge across files instead of overriding ([settings](https://code.claude.com/docs/en/settings#settings-precedence)).
  - `--setting-sources` picks which files load, and `--bare` loads none of the hooks, agents or plugins ([CLI reference](https://code.claude.com/docs/en/cli-reference)).
- **`env` in settings beats the shell.** "A value here overwrites the same variable exported in your shell." It reaches "the subprocesses Claude Code starts", hooks included. Project `env` applies after trust, or at once under `-p`. Project files can't set some variables, such as `CLAUDE_CONFIG_DIR` ([settings reference](https://code.claude.com/docs/en/settings-reference#env)). The [benchmark sandbox spike](benchmark-sandbox-spike.md) hit this: `ISSUE_TRACKER` in project settings beat the shell's.
- **Codex** layers CLI flags, then project `.codex/config.toml` files from the root down to the working folder, then `--profile`, then user, cloud-managed and system config. Untrusted projects skip `.codex/` entirely ([config basics](https://learn.chatgpt.com/docs/config-file/config-basic.md)).
- **Cursor** takes hooks from enterprise, then team, then project, then user, then plugins ([hooks](https://cursor.com/docs/agent/hooks)).
- **Aider** loads home, then git root, then the current folder, last wins, and `--config` loads one file only ([config](https://aider.chat/docs/config/aider_conf.html)).

## What was tried here

- **3987494** made the intent judge a plugin at `.claude/skills/intent-judge`, loaded as `intent-judge@skills-dir`, with its evals beside it for `claude plugin eval`.
  - The guard went in `hooks/hooks.json`, "because a plugin agent's own frontmatter hooks are ignored".
  - Each case asked a session to run the judge and relay its reply, "because `claude plugin eval` grades the session's last message".
- **0ac2dd0** undid it when the evals moved to Harbor.
  - The judge became a plain project agent with its guard in frontmatter.
  - Each Harbor task holds only what the judge sees, and `job.yaml` mounts the judge into each container.
  - With the judge as the session's own agent, through `config: { agent: intent-judge }`, no relay was needed.
- **Harbor runs the session headless** (from the installed Harbor 0.25.0 source, `harbor/agents/installed/claude_code.py`; [repository](https://github.com/harbor-framework/harbor)).
  - It runs `claude --print --permission-mode=bypassPermissions`, with `CLAUDE_CONFIG_DIR` set to a fresh folder per trial.
  - It passes the job's `config` as `--settings`.
- **So the frontmatter guard probably never fires there.** Harbor has no trust entry for `/app`, and the docs say frontmatter guards then don't run. The trial logs from 0ac2dd0 hold no guard message, though with no code under test there was nothing for it to block. So a missing guard wouldn't change a grade: the copy is the real boundary there. The spike's sandbox had an interactive session first, which may explain why its guards fired.

## What this suggests

Three ways to package the intent judge, the mutant writer, their guards and their tooling (`file-roles`, `spec-mutants`):

|  | A. Stay as project agents | B. One Claude Code plugin | C. A CLI that runs its own session |
| --- | --- | --- | --- |
| Shape | Copy `.claude/agents/<agent>/` and `tools/` into each repository | `plugins/review-checks/` with `agents/`, `hooks/hooks.json`, `scripts/`, listed in a `.claude-plugin/marketplace.json` in this repository | A package whose command runs `claude -p --agents '<json>'` or the Agent SDK, with the guards and tools inside |
| Guard | Frontmatter hook per agent | One PreToolUse hook that reads `agent_type` (`review-checks:intent-judge`, `review-checks:mutant-writer`) and passes every other agent. The mutant writer's check is a SubagentStop hook matching its type, plus Stop when it's the main session | Hooks in the `--agents` JSON, or on the SDK query |
| Runs headless without trust | No | Not documented. Repository plugins need trust; `--plugin-dir` and seeds aren't said to | Yes, documented for `--agents` |
| Install in another repository | Copy files, then keep them in step by hand | `extraKnownMarketplaces` and `enabledPlugins` in `.claude/settings.json`, pinned by `sha`, then one `claude plugin install --scope project` per contributor | Add the package and run it |
| Repository's own globs | `env` in `.claude/settings.json` | Same; `env` reaches plugin hooks. Plugin options can't, being user-only | Arguments or a config file the package reads |
| Agents usable as in-session subagents | Yes | Yes | No, unless also shipped as a plugin |
| Main cost | Drift between copies, and the trust gap | `spec-mutants` needs the host's Vitest and zod, and the plugin's dependency install skips pnpm lockfiles. The guard runs on every tool call in every session | A second way to run agents, outside Claude Code's own agent loading |

- **What Harbor needs under each:**
  - **A.** Keep the mounts in `job.yaml`. To make the guard run, add a trust entry for `/app` to the trial's `.claude.json` before the run.
  - **B.**
    - Mount the plugin folder read-only in place of the three mounts.
    - Set `CLAUDE_CODE_PLUGIN_DIRS` in the agent's `env`, or seed it.
    - Set `config: { agent: review-checks:intent-judge, env: { SPEC_FILES: …, TEST_FILES: …, TEST_SUPPORT_FILES: … } }`, so the settings file needn't be mounted.
    - Then check a trial's debug log to confirm the hook loads under `--print`, since the docs don't say.
  - **C.** Harbor's `claude-code` agent can't pass `--agents`, so it needs a small custom Harbor agent that runs the package's command. The task folders stay as they are.
- **B fits best if the agents stay in Claude Code.** It's the only documented way to install agents, guards and scripts together and pin them. Its guard has to dispatch on `agent_type` whichever option is picked. Before choosing it:
  - Settle whether `spec-mutants` belongs in the plugin or stays a repository tool the plugin calls.
  - Prove the hook fires under Harbor.
- **C fits if the checks should run outside a Claude Code session**, such as in CI or other tools. It's also the only option the docs say runs its guards headless without a trust step.
- **A filtered copy beats a better guard.** Whichever is picked, the Harbor tasks already show it: an agent that never reads the code under test is safest when the code isn't there. A filtered worktree or mount per run would give the same in real use, at the cost of building it each time.
