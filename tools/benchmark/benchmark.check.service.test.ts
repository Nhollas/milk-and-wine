import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { check } from "./check.ts";

test("B4: reports a hidden test that passes on the starter code", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", { scenarios: ["B1"], hiddenTests: ["B1: costs 2 each"] });
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }]);
  hiddenTests.onStarter([{ title: "B1: costs 2 each", passed: true }]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("passes on the starter code");
  expect(result.output).toContain("B1: costs 2 each");
});

test("B4: does not report a hidden test that fails on the starter code", ({
  tasks,
  hiddenTests,
}) => {
  tasks.addTask("widgets", {
    scenarios: ["B1", "B2"],
    hiddenTests: ["B1: costs 2 each", "B2: costs 4 for two"],
  });
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }, { title: "B2: costs 4 for two" }]);
  hiddenTests.onStarter([
    { title: "B1: costs 2 each", passed: true },
    { title: "B2: costs 4 for two", passed: false },
  ]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("passes on the starter code  B1: costs 2 each");
  expect(result.output).not.toContain("B2: costs 4 for two");
});

test("B5: reports a scenario with no hidden test", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", { scenarios: ["B1", "B2"], hiddenTests: ["B1: costs 2 each"] });
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("no hidden test");
  expect(result.output).toContain("B2");
});

test("B5: reports only the scenarios with no hidden test", ({ tasks, hiddenTests }) => {
  const titles = ["B1: costs 2 each", "B2: costs 4 for two"];
  tasks.addTask("widgets", { scenarios: ["B1", "B2", "B3"], hiddenTests: titles });
  hiddenTests.onSolution(titles.map((title) => ({ title })));

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("no hidden test  B3");
  expect(result.output).not.toContain("no hidden test  B1");
  expect(result.output).not.toContain("no hidden test  B2");
});

test("B5: does not count a B10 hidden test as testing B1", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", { scenarios: ["B1", "B10"], hiddenTests: ["B10: costs 4 for two"] });
  hiddenTests.onSolution([{ title: "B10: costs 4 for two" }]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("no hidden test  B1\n");
  expect(result.output).not.toContain("no hidden test  B10");
});

test("B6: reports a hidden test naming an ID the spec lacks", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", {
    scenarios: ["B1"],
    hiddenTests: ["B1: costs 2 each", "B9: costs 4 for two"],
  });
  hiddenTests.onSolution([{ title: "B1: costs 2 each" }, { title: "B9: costs 4 for two" }]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("unknown-id");
  expect(result.output).toContain("B9: costs 4 for two");
});

test("B6: treats B100 as unknown when the spec has B10", ({ tasks, hiddenTests }) => {
  const titles = ["B10: costs 2 each", "B100: costs 4 for two"];
  tasks.addTask("widgets", { scenarios: ["B10"], hiddenTests: titles });
  hiddenTests.onSolution(titles.map((title) => ({ title })));

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("unknown-id  B100: costs 4 for two");
  expect(result.output).not.toContain("unknown-id  B10: costs 2 each");
});

test("B26: prints usage and exits 1 when no task name is given", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets");

  const result = check([], { root: tasks.root, hiddenTests });

  expect(result).toEqual({ exitCode: 1, output: "usage: pnpm bench:check <task>\n" });
});

test("B1: rejects a task name with no task folder", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets");

  const result = check(["gadgets"], { root: tasks.root, hiddenTests });

  expect(result).toEqual({ exitCode: 1, output: "unknown task: gadgets\n" });
});

test.for([
  ["spec", "widgets is not valid:\n  missing spec\n"],
  ["issue", "widgets is not valid:\n  missing issue\n"],
  ["ticket", "widgets is not valid:\n  missing ticket\n"],
  ["starter code", "widgets is not valid:\n  missing starter code\n"],
  ["hidden tests", "widgets is not valid:\n  missing hidden tests\n"],
  ["solution", "widgets is not valid:\n  missing solution\n"],
] as const)(
  "B2: rejects a task missing its %s",
  ([part, expectedOutput], { tasks, hiddenTests }) => {
    tasks.addTask("widgets", { without: [part] });

    const result = check(["widgets"], { root: tasks.root, hiddenTests });

    expect(result).toEqual({ exitCode: 1, output: expectedOutput });
  },
);

test.for([
  ["ticket", "widgets is not valid:\n  missing ticket\n"],
  ["starter code", "widgets is not valid:\n  missing starter code\n"],
  ["hidden tests", "widgets is not valid:\n  missing hidden tests\n"],
  ["solution", "widgets is not valid:\n  missing solution\n"],
] as const)(
  "B2: rejects a task whose %s folder is empty",
  ([part, expectedOutput], { tasks, hiddenTests }) => {
    tasks.addTask("widgets", { emptied: [part] });

    const result = check(["widgets"], { root: tasks.root, hiddenTests });

    expect(result).toEqual({ exitCode: 1, output: expectedOutput });
  },
);

test("B2: names each part a task lacks", ({ tasks, hiddenTests }) => {
  tasks.addTask("widgets", { without: ["issue", "solution"] });

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("widgets is not valid:\n");
  expect(result.output).toContain("  missing issue\n");
  expect(result.output).toContain("  missing solution\n");
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
    { title: "B1: costs 2 each" },
    { title: "B2: costs 4 for two" },
    { title: "B2: costs 6 for three" },
  ]);

  const result = check(["widgets"], { root: tasks.root, hiddenTests });

  expect(result).toEqual({
    exitCode: 0,
    output: "ok: 2 scenarios, 3 hidden tests\nbench:check passed\n",
  });
});
