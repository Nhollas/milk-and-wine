import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
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
  tasks.addTask("gadgets");
  tasks.addTask("widgets", { without: ["solution"] });

  const result = run(["gadgets", "widgets", "--agent", "baseline", "--trials", "2"], {
    root: tasks.root,
    hiddenTests,
    repository,
    trials,
  });

  expect(result).toEqual({ exitCode: 1, output: "widgets is not valid:\n  missing solution\n" });
  expect(trials.started).toEqual([]);
});
