/** A one-scenario example for the tests of this tool, with the edits its cases plant. */
export const PRICES = `export function priceOf(quantity: number): number {
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

export const WIDGETS = {
  scenarios: [["B1", "Costs 2 each, up to 10"]] as [string, string][],
  code: PRICES,
  tests: PRICES_TESTS,
};

const TESTS_FILE = "src/widgets/widgets.service.test.ts";

/** Removes the test's check of the cap. */
export const NO_CAP_CHECK = {
  file: TESTS_FILE,
  find: ["  expect(priceOf(7)).toBe(10);"],
  replace: [],
};

/** Removes the cap from the code. */
export const NO_CAP = {
  file: "src/widgets/widgets.ts",
  find: ["  return Math.min(quantity * 2, 10);"],
  replace: ["  return quantity * 2;"],
};
