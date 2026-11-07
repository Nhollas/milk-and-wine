import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { check } from "./check.ts";
import { run } from "./run.ts";

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

  const problems = (task: string) => check([task], { root: tasks.root, hiddenTests }).output;
  expect(result.exitCode).toBe(1);
  expect(result.output).toContain(problems("gadgets"));
  expect(result.output).toContain(problems("widgets"));
  expect(trials.started).toEqual([]);
});
