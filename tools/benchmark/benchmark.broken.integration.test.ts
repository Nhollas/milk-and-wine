import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { runTrial } from "./trial.ts";

test("records why a trial's agent stopped early", ({ tasks, harbor, workFolder }) => {
  tasks.addTask("widgets");
  tasks.addFiles({
    "CODING-STANDARDS.md": "# Coding standards\n",
    "docs/agents/issue-tracker/bench.md": "Merge the ticket's branch with --no-ff.\n",
    "tools/benchmark/trial-config/package.json": "{}\n",
  });
  harbor.leavesOutput({
    agentStartedAt: "2026-11-09T14:00:00.000000Z",
    agentFinishedAt: "2026-11-09T14:00:01.000000Z",
    claudeResult: { type: "result", subtype: "success", is_error: true, modelUsage: {} },
    exceptionType: "AgentAuthenticationError",
  });

  const record = runTrial(
    { task: "widgets", agent: "baseline" },
    { root: tasks.root, workFolder, harbor: harbor.run },
  );

  expect(record.broken).toBe("AgentAuthenticationError");
});
