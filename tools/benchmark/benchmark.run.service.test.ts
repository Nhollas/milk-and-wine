import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { run } from "./run.ts";

function jsonLines(output: string): { wallClockMs: number }[] {
  return output
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as { wallClockMs: number });
}

test("B8: refuses to run with uncommitted changes", ({
  tasks,
  hiddenTests,
  repository,
  trials,
}) => {
  tasks.addTask("widgets");
  repository.addUncommittedChanges();

  const result = run(["widgets", "--agent", "foreman", "--trials", "2"], {
    root: tasks.root,
    hiddenTests,
    repository,
    trials,
  });

  expect(result).toEqual({
    exitCode: 1,
    output: "commit first: results name the commit they measured\n",
  });
  expect(trials.started).toEqual([]);
});

test("B9: refuses to run an invalid task", ({ tasks, hiddenTests, repository, trials }) => {
  tasks.addTask("gadgets", { without: ["issue"] });
  tasks.addTask("widgets", { without: ["solution"] });

  const result = run(["gadgets", "widgets", "--agent", "baseline", "--trials", "2"], {
    root: tasks.root,
    hiddenTests,
    repository,
    trials,
  });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("gadgets is not valid:\n  missing issue\n");
  expect(result.output).toContain("widgets is not valid:\n  missing solution\n");
  expect(trials.started).toEqual([]);
});

test("B27: starts --trials trials of each agent on each task, printing each trial's measures as a line of JSON", ({
  tasks,
  hiddenTests,
  repository,
  trials,
}) => {
  tasks.addTask("gadgets");
  tasks.addTask("widgets");
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }]);

  const result = run(
    ["gadgets", "widgets", "--agent", "foreman", "--agent", "baseline", "--trials", "2"],
    { root: tasks.root, hiddenTests, repository, trials },
  );

  expect(trials.started.map(({ task, agent }) => `${task}/${agent}`).toSorted()).toEqual([
    "gadgets/baseline",
    "gadgets/baseline",
    "gadgets/foreman",
    "gadgets/foreman",
    "widgets/baseline",
    "widgets/baseline",
    "widgets/foreman",
    "widgets/foreman",
  ]);
  expect(jsonLines(result.output).map(({ wallClockMs }) => wallClockMs)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8,
  ]);
  expect(result.exitCode).toBe(0);
});

test("B27: starts 1 trial of each agent on each task when --trials isn't given", ({
  tasks,
  hiddenTests,
  repository,
  trials,
}) => {
  tasks.addTask("widgets");
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }]);

  const result = run(["widgets", "--agent", "foreman", "--agent", "baseline"], {
    root: tasks.root,
    hiddenTests,
    repository,
    trials,
  });

  expect(trials.started).toEqual([
    { task: "widgets", agent: "foreman" },
    { task: "widgets", agent: "baseline" },
  ]);
  expect(jsonLines(result.output)).toEqual([
    { task: "widgets", agent: "foreman", wallClockMs: 1 },
    { task: "widgets", agent: "baseline", wallClockMs: 2 },
  ]);
});
