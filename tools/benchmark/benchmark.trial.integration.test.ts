import { expect } from "vitest";
import { join } from "node:path";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { runTrial } from "./trial.ts";

const projectFiles = {
  ".gitignore": ".issues/\n",
  "package.json": "{}\n",
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  "pnpm-workspace.yaml": "packages: []\n",
  "tsconfig.json": "{}\n",
  "vitest.config.ts": "export default {};\n",
  ".oxlintrc.json": "{}\n",
  ".oxfmtrc.json": "{}\n",
  "knip.json": "{}\n",
  "commitlint.config.ts": "export default {};\n",
  "stryker.config.json": "{}\n",
  ".husky/pre-commit": "pnpm check\n",
  "CODING-STANDARDS.md": "# Coding standards\n",
  "GLOSSARY.md": "# Glossary\n",
  "README.md": "# Readme\n",
  "AGENTS.md": "# Agents\n",
  "INTENT.md": "# Intent\n",
  ".claude/settings.json": "{}\n",
  ".claude/skills/foreman/SKILL.md": "# Foreman\n",
  "docs/adr/0002-names.md": "# Names\n",
  "docs/workflow.md": "# Workflow\n",
  "docs/agents/issue-tracker/bench.md": "Merge the ticket's branch with --no-ff.\n",
  "docs/agents/issue-tracker/active.sh": "#!/bin/sh\n",
  "tools/specs/specs.ts": "export {};\n",
  "tools/spec-mutants/mutants.ts": "export {};\n",
  "src/loans/loans.service.ts": "export {};\n",
  "specs/loans/spec.md": "# Loans\n",
};

// The trial's own config, kept apart from the project's root config above, which is the decoy.
const trialConfig = {
  ".gitignore": ".issues/\nnode_modules/\n",
  "package.json": '{ "scripts": { "check": "tsc && vitest run" } }\n',
  "pnpm-lock.yaml": "lockfileVersion: '9.0'\n# trial\n",
  "pnpm-workspace.yaml": "packages: []\n# trial\n",
  "tsconfig.json": '{ "compilerOptions": { "strict": true } }\n',
  "vitest.config.ts": "export default { test: { include: ['**/*.test.ts'] } };\n",
};

const trialConfigFiles = Object.fromEntries(
  Object.entries(trialConfig).map(([path, content]) => [
    `tools/benchmark/trial-config/${path}`,
    content,
  ]),
);

const baselineFiles = [
  ".gitignore",
  ".issues/widgets/issue.md",
  ".issues/widgets/tickets/01.md",
  "CODING-STANDARDS.md",
  "ISSUE-TRACKER.md",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "specs/widgets/spec.md",
  "src/widgets.ts",
  "tsconfig.json",
  "vitest.config.ts",
];

const foremanOnlyFiles = [
  ".claude/settings.json",
  ".claude/skills/foreman/SKILL.md",
  "GLOSSARY.md",
  "docs/adr/0002-names.md",
  "docs/agents/issue-tracker/active.sh",
  "docs/agents/issue-tracker/bench.md",
  "tools/spec-mutants/mutants.ts",
  "tools/specs/specs.ts",
];

/** The repository the task folder's Dockerfile copies in: `environment/repo/`. */
function repositoryFolder(taskFolder: string): string {
  return join(taskFolder, "environment", "repo");
}

test("B10: gives a baseline trial only the task, the standards, the config and the bench tracker", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });

  runTrial(
    { task: "widgets", agent: "baseline" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  const repository = repositoryFolder(harbor.taskFolder());
  expect(folders.filesUnder(repository)).toEqual(baselineFiles);
  expect(folders.isGitRoot(repository)).toBe(true);
  expect(
    Object.fromEntries(
      Object.keys(trialConfig).map((path) => [path, folders.fileText(repository, path)]),
    ),
  ).toEqual(trialConfig);
});

test("B10: gives a foreman trial its own process too", ({ tasks, harbor, folders, workFolder }) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });

  runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  const repository = repositoryFolder(harbor.taskFolder());
  expect(folders.filesUnder(repository)).toEqual(
    [...baselineFiles, ...foremanOnlyFiles].toSorted(),
  );
  expect(folders.isGitRoot(repository)).toBe(true);
  expect(
    Object.fromEntries(
      Object.keys(trialConfig).map((path) => [path, folders.fileText(repository, path)]),
    ),
  ).toEqual(trialConfig);
});

test("B10: puts the bench tracker's instructions in ISSUE-TRACKER.md and the starter code at the root", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });

  runTrial(
    { task: "widgets", agent: "baseline" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  const repository = repositoryFolder(harbor.taskFolder());
  expect(folders.fileText(repository, "ISSUE-TRACKER.md")).toBe(
    "Merge the ticket's branch with --no-ff.\n",
  );
  expect(folders.fileText(repository, "src/widgets.ts")).toBe(`export const mode = "starter";\n`);
});

test("B11: runs foreman once on the issue, with the bench tracker", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });

  runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  expect(harbor.runs).toHaveLength(1);
  const args = harbor.runs[0]?.args ?? [];
  expect(args[0]).toBe("run");
  expect(args[args.indexOf("-a") + 1]).toBe("claude-code");
  const agentEnvironment = args.flatMap((arg, index) => (arg === "--ae" ? [args[index + 1]] : []));
  expect(agentEnvironment).toContain("ISSUE_TRACKER=bench");
  expect(folders.fileText(harbor.taskFolder(), "instruction.md")?.trim()).toBe("/foreman widgets");
});

// The 2-hour limit is a sentence of the spec, not a scenario; B14 records the timeout itself.
test("B11: gives the agent a 2-hour timeout in the task folder", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });

  runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  const taskToml = folders.fileText(harbor.taskFolder(), "task.toml") ?? "";
  expect(taskToml).toMatch(/\[agent\][^[]*\btimeout_sec\s*=\s*7200(\.0)?\s*$/mu);
});

test("B16: records a trial's wall-clock time, and its tokens by model, subagents included", ({
  tasks,
  harbor,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles({ ...projectFiles, ...trialConfigFiles });
  // The main thread only ever runs claude-opus-4-1. claude-sonnet-4-5 is a subagent's model: its
  // usage is in no main-thread message, only in the final result's `modelUsage`.
  harbor.leavesOutput({
    agentStartedAt: "2026-11-09T14:00:00.000000Z",
    agentFinishedAt: "2026-11-09T14:01:30.000000Z",
    claudeMessages: [
      {
        type: "assistant",
        parent_tool_use_id: null,
        message: {
          model: "claude-opus-4-1",
          usage: {
            input_tokens: 700,
            output_tokens: 200,
            cache_read_input_tokens: 2000,
            cache_creation_input_tokens: 300,
          },
        },
      },
      {
        type: "assistant",
        parent_tool_use_id: null,
        message: {
          model: "claude-opus-4-1",
          usage: {
            input_tokens: 500,
            output_tokens: 100,
            cache_read_input_tokens: 2000,
            cache_creation_input_tokens: 200,
          },
        },
      },
    ],
    claudeResult: {
      type: "result",
      subtype: "success",
      duration_ms: 5_000,
      total_cost_usd: 0.5,
      modelUsage: {
        "claude-opus-4-1": {
          inputTokens: 1200,
          outputTokens: 300,
          cacheReadInputTokens: 4000,
          cacheCreationInputTokens: 500,
          costUSD: 0.4,
        },
        "claude-sonnet-4-5": {
          inputTokens: 700,
          outputTokens: 90,
          cacheReadInputTokens: 11,
          cacheCreationInputTokens: 60,
          costUSD: 0.1,
        },
      },
    },
  });

  const record = runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  expect(record.wallClockMs).toBe(90_000);
  expect(record.tokens).toEqual({
    "claude-opus-4-1": {
      inputTokens: 1200,
      outputTokens: 300,
      cacheReadInputTokens: 4000,
      cacheCreationInputTokens: 500,
    },
    "claude-sonnet-4-5": {
      inputTokens: 700,
      outputTokens: 90,
      cacheReadInputTokens: 11,
      cacheCreationInputTokens: 60,
    },
  });
});

test.todo("B12: runs baseline once, told to deliver the issue's tickets");

test.todo("B14: records a trial that errors or times out as broken, and goes on");

test.todo("B15: stops the experiment at the usage limit, keeping finished trials");
