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

/** The repository in a Harbor task folder's `environment/`, less the Dockerfile Harbor needs beside it. */
function repositoryFiles(listFiles: (folder: string) => string[], taskFolder: string): string[] {
  return listFiles(join(taskFolder, "environment")).filter((path) => path !== "Dockerfile");
}

test("B10: gives a baseline trial only the task, the standards, the config and the bench tracker", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial(
    { task: "widgets", agent: "baseline" },
    { root: tasks.root, workFolder, runProcess: harbor.run.bind(harbor) },
  );

  expect(repositoryFiles(folders.filesUnder, harbor.taskFolder())).toEqual(baselineFiles);
  expect(folders.isGitRoot(join(harbor.taskFolder(), "environment"))).toBe(true);
});

test("B10: gives a foreman trial its own process too", ({ tasks, harbor, folders, workFolder }) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, runProcess: harbor.run.bind(harbor) },
  );

  expect(repositoryFiles(folders.filesUnder, harbor.taskFolder())).toEqual(
    [...baselineFiles, ...foremanOnlyFiles].toSorted(),
  );
  expect(folders.isGitRoot(join(harbor.taskFolder(), "environment"))).toBe(true);
});

test("B10: puts the bench tracker's instructions in ISSUE-TRACKER.md and the starter code at the root", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial(
    { task: "widgets", agent: "baseline" },
    { root: tasks.root, workFolder, runProcess: harbor.run.bind(harbor) },
  );

  const environment = join(harbor.taskFolder(), "environment");
  expect(folders.fileText(environment, "ISSUE-TRACKER.md")).toBe(
    "Merge the ticket's branch with --no-ff.\n",
  );
  expect(folders.fileText(environment, "src/widgets.ts")).toBe(`export const mode = "starter";\n`);
});

test("B11: runs foreman once on the issue, with the bench tracker", ({
  tasks,
  harbor,
  folders,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, runProcess: harbor.run.bind(harbor) },
  );

  expect(harbor.calls).toHaveLength(1);
  expect(harbor.calls[0]?.command).toBe("harbor");
  expect(harbor.calls[0]?.args[0]).toBe("run");
  expect(folders.fileText(harbor.taskFolder(), "instruction.md")?.trim()).toBe("/foreman widgets");
  expect(harbor.calls[0]?.args.join(" ")).toContain("--ae ISSUE_TRACKER=bench");
});

test("B16: records a trial's wall-clock time, and its tokens by model, subagents included", ({
  tasks,
  harbor,
  workFolder,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);
  harbor.producesTrial({
    startedAt: "2026-11-09T14:00:00.000000Z",
    finishedAt: "2026-11-09T14:01:30.000000Z",
    claudeResult: {
      type: "result",
      duration_ms: 5_000,
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
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 60,
          costUSD: 0.1,
        },
      },
    },
  });

  const record = runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, workFolder, runProcess: harbor.run.bind(harbor) },
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
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 60,
    },
  });
});

test.todo("B12: runs baseline once, told to deliver the issue's tickets");

test.todo("B14: records a trial that errors or times out as broken, and goes on");

test.todo("B15: stops the experiment at the usage limit, keeping finished trials");
