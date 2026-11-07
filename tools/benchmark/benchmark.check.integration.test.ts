import { expect } from "vitest";
import { test } from "../../tests/support/benchmark.fixtures.ts";
import { check } from "./check.ts";
import { vitestHiddenTests } from "./hidden-tests.ts";

test("B3: reports a hidden test that fails on the solution", ({ tasks }) => {
  tasks.addTask("widgets", {
    scenarios: ["B1", "B2"],
    hiddenTests: ["B1: costs 2 each"],
    failingHiddenTests: ["B2: costs 4 for two"],
  });

  const result = check(["widgets"], {
    root: tasks.root,
    hiddenTests: vitestHiddenTests(process.cwd()),
  });

  expect(result.exitCode).toBe(1);
  expect(result.output).toContain("fails on the solution");
  expect(result.output).toContain("B2: costs 4 for two");
});
