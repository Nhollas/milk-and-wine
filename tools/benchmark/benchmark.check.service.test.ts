import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { check } from "./check.ts";

type TaskPart = "spec" | "issue" | "ticket" | "starter code" | "hidden tests" | "solution";

test.todo("B4: reports a hidden test that passes on the starter code");

test.todo("B5: reports a scenario with no hidden test");

test.todo("B6: reports a hidden test naming an ID the spec lacks");

test("B1: rejects a task name with no task folder", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets");

  const result = check(["gadgets"], { root: tasks.root, hiddenTests });

  expect(result).toEqual({ exitCode: 1, output: "unknown task: gadgets\n" });
});

test.for<[TaskPart, string]>([
  ["spec", "widgets is not valid:\n  missing spec\n"],
  ["issue", "widgets is not valid:\n  missing issue\n"],
  ["ticket", "widgets is not valid:\n  missing ticket\n"],
  ["starter code", "widgets is not valid:\n  missing starter code\n"],
  ["hidden tests", "widgets is not valid:\n  missing hidden tests\n"],
  ["solution", "widgets is not valid:\n  missing solution\n"],
])("B2: rejects a task missing its %s", ([part, expectedOutput], { tasks, hiddenTests }) => {
  tasks.addTask("widgets", { without: [part] });

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  // oxlint-disable-next-line vitest/no-standalone-expect -- test.for hands the test its fixtures; the lint rule only knows test.each
  expect(result).toEqual({ exitCode: 1, output: expectedOutput });
});

test("B2: names each part a task lacks", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", { without: ["issue", "solution"] });

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result).toEqual({
    exitCode: 1,
    output: "widgets is not valid:\n  missing issue\n  missing solution\n",
  });
});

test("B7: passes a valid task, counting its scenarios and hidden tests", ({
  tasks,
  hiddenTests,
}) => {
  tasks.addTask("widgets", {
    scenarios: ["B1", "B2"],
    hiddenTests: ["B1: costs 2 each", "B2: costs 4 for two", "B2: costs 6 for three"],
  });
  hiddenTests.onSolution([
    { title: "B1: costs 2 each", passed: true },
    { title: "B2: costs 4 for two", passed: true },
    { title: "B2: costs 6 for three", passed: true },
  ]);
  hiddenTests.onStarter([
    { title: "B1: costs 2 each", passed: false },
    { title: "B2: costs 4 for two", passed: false },
    { title: "B2: costs 6 for three", passed: false },
  ]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result).toEqual({
    exitCode: 0,
    output: "ok: 2 scenarios, 3 hidden tests\nbench:check passed\n",
  });
});
