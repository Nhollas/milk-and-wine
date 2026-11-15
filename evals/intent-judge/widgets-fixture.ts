import { specMarkdown } from "./temp-root.ts";

/** A one-scenario fixture for the tests of these tools, with the files its tasks hold. */
const PRICES = `export function priceOf(quantity: number): number {
  return Math.min(quantity * 2, 10);
}
`;

export const PRICES_TESTS = `import { expect, test } from "vitest";
import { priceOf } from "./widgets.ts";

test("B1: costs 2 each, up to 10", () => {
  expect(priceOf(3)).toBe(6);
  expect(priceOf(7)).toBe(10);
});
`;

const SCENARIOS: [string, string][] = [["B1", "Costs 2 each, up to 10"]];

export const WIDGETS = { scenarios: SCENARIOS, code: PRICES, tests: PRICES_TESTS };

export const SPEC_PATH = "specs/modules/widgets/spec.md";

const TESTS_PATH = "src/widgets/widgets.test.ts";

export const CODE_PATH = "src/widgets/widgets.ts";

const WIDGETS_SPEC = specMarkdown("widgets", SCENARIOS);

export const TASK_TOML = `[metadata]\nfixture = "widgets"\n`;

/** The fixture's tests with the check of the cap removed. */
export const NO_CAP_CHECK = PRICES_TESTS.replace("  expect(priceOf(7)).toBe(10);\n", "");

/** The fixture's code with the cap removed. */
export const NO_CAP = PRICES.replace("Math.min(quantity * 2, 10)", "quantity * 2");

/** A task's environment: the fixture's spec, and its tests as `tests`. */
export function environmentWith(tests: string): Record<string, string> {
  return { Dockerfile: "FROM node:24\n", [SPEC_PATH]: WIDGETS_SPEC, [TESTS_PATH]: tests };
}

/** A task whose tests never check the cap, and the bug that shows it. */
export const CAP_UNCHECKED = {
  taskToml: TASK_TOML,
  expected: { scenario: "B1", verdict: "misses_requirement", requirement: "up to 10" },
  environment: environmentWith(NO_CAP_CHECK),
  bug: { [CODE_PATH]: NO_CAP },
};

/** The fixture's tests with the check of the cap replaced by `line`. */
export function replacingCapCheck(line: string): string {
  return PRICES_TESTS.replace("  expect(priceOf(7)).toBe(10);", line);
}

/** A task expecting its tests, `tests`, to contradict the cap. */
export function contradicts(tests: string) {
  return {
    taskToml: TASK_TOML,
    expected: { scenario: "B1", verdict: "contradicts_requirement", requirement: "up to 10" },
    environment: environmentWith(tests),
  };
}

/** A task expecting its tests, `tests`, to be aligned with B1. */
export function aligned(tests: string) {
  return {
    taskToml: TASK_TOML,
    expected: { scenario: "B1", verdict: "aligned" },
    environment: environmentWith(tests),
  };
}
