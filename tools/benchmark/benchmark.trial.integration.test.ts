import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { runTrial } from "./trial.ts";

const projectFiles = {
  ".gitignore": ".issues/\n",
  "package.json": "{}\n",
  "tsconfig.json": "{}\n",
  "vitest.config.ts": "export default {};\n",
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

test("B10: gives a baseline trial only the task, the standards, the config and the bench tracker", ({
  tasks,
  sandboxes,
  clock,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial({ task: "widgets", agent: "baseline" }, { root: tasks.root, sandboxes, now: clock.now });

  expect(sandboxes.files()).toEqual(baselineFiles);
  expect(sandboxes.gitRoot()).toBe(sandboxes.realFolder());
});

test("B10: gives a foreman trial its own process too", ({ tasks, sandboxes, clock }) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial({ task: "widgets", agent: "foreman" }, { root: tasks.root, sandboxes, now: clock.now });

  expect(sandboxes.files()).toEqual([...baselineFiles, ...foremanOnlyFiles].toSorted());
  expect(sandboxes.gitRoot()).toBe(sandboxes.realFolder());
});

test("B10: puts the bench tracker's instructions in ISSUE-TRACKER.md", ({
  tasks,
  sandboxes,
  clock,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial({ task: "widgets", agent: "baseline" }, { root: tasks.root, sandboxes, now: clock.now });

  expect(sandboxes.read("ISSUE-TRACKER.md")).toBe("Merge the ticket's branch with --no-ff.\n");
  expect(sandboxes.read("src/widgets.ts")).toBe(`export const mode = "starter";\n`);
});

test("B11: runs foreman once on the issue, with the bench tracker", ({
  tasks,
  sandboxes,
  clock,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);

  runTrial({ task: "widgets", agent: "foreman" }, { root: tasks.root, sandboxes, now: clock.now });

  expect(sandboxes.executed).toHaveLength(1);
  expect(sandboxes.executed[0]?.command.slice(0, 3)).toEqual(["claude", "-p", "/foreman widgets"]);
  expect(sandboxes.executed[0]?.env).toMatchObject({ ISSUE_TRACKER: "bench" });
});

test("B16: records a trial's wall-clock time, and its tokens by model, subagents included", ({
  tasks,
  sandboxes,
  clock,
}) => {
  tasks.addTask("widgets");
  tasks.addFiles(projectFiles);
  sandboxes.claudeRunsFor({
    takesMilliseconds: 90_000,
    stdout: JSON.stringify({
      type: "result",
      duration_ms: 5_000,
      modelUsage: {
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
      },
    }),
  });

  const record = runTrial(
    { task: "widgets", agent: "foreman" },
    { root: tasks.root, sandboxes, now: clock.now },
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
