import { expect, test } from "vitest";
import { gradeScenarios } from "./measure.ts";

test("B17: counts a scenario passed only when all its hidden tests pass", () => {
  const grade = gradeScenarios(
    ["B1", "B2", "B3", "B10"],
    [
      { title: "B1: costs 2 each", passed: true },
      { title: "B1: costs nothing for none", passed: true },
      { title: "B2: costs 4 for two", passed: true },
      { title: "B2: refuses a negative count", passed: false },
      { title: "B10: rounds to the penny", passed: true },
    ],
  );

  expect(grade).toEqual({ passRate: 0.5, failedScenarios: ["B2", "B3"] });
});

test.todo("B18: counts a false pass when the trial's own tests pass and a hidden test fails");

test.todo("B20: records the mutation score of the trial's own tests");

test.todo("B21: records the longest function and the highest cognitive complexity");
