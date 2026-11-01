// oxlint-disable unicorn/no-thenable -- mutants.json names each scenario's Then column `then`
import { expect, test } from "vitest";
import { replay } from "./replay.ts";
import { createTempRepo } from "./temp-repo.ts";

const PRICES = `export function priceOf(quantity: number): number {
  return quantity * 2;
}
`;

const PRICES_TESTS = `import { expect, test } from "vitest";
import { priceOf } from "./widgets.ts";

test("B1: costs 2 each", () => {
  expect(priceOf(3)).toBe(6);
});
`;

const TIMES_THREE = {
  breaks: "the price is 3 each",
  file: "src/widgets/widgets.ts",
  find: ["  return quantity * 2;"],
  replace: ["  return quantity * 3;"],
};

const FREE_AT_SEVEN = {
  breaks: "7 widgets are free",
  file: "src/widgets/widgets.ts",
  find: ["  return quantity * 2;"],
  replace: ["  return quantity === 7 ? 0 : quantity * 2;"],
};

test("B15: shows what a changed Then was and now is, and skips that scenario's mutants", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each, rounded up"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [TIMES_THREE] } });

  expect(replay(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B1  then-changed",
      "    was  Costs 2 each",
      "    now  Costs 2 each, rounded up",
      "spec:mutants failed · 1 problems",
      "",
    ].join("\n"),
  });
});

test("B16: skips a scenario whose tests fail, or don't exist, with no mutant planted", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [
    ["B1", "Costs 2 each"],
    ["B2", "Is never negative"],
  ]);
  repo.writeFile(
    "src/widgets/widgets.ts",
    "export function priceOf(quantity: number): number {\n  return quantity * 5;\n}\n",
  );
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", {
    B1: { then: "Costs 2 each", mutants: [TIMES_THREE] },
    B2: { then: "Is never negative", mutants: [FREE_AT_SEVEN] },
  });

  expect(replay(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B1  its tests must pass with no mutant planted, but they failed",
      "B2  its tests must pass with no mutant planted, but there are none",
      "spec:mutants failed · 2 problems",
      "",
    ].join("\n"),
  });
});

test("B17: marks a mutant killed when a scenario test fails", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [TIMES_THREE] } });

  const { output } = replay(["widgets"], repo.root);

  expect(output).toContain("    killed    the price is 3 each\n");
});

test("B27: marks a mutant survived when a scenario's tests all pass", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [FREE_AT_SEVEN] } });

  const { output } = replay(["widgets"], repo.root);

  expect(output).toContain("    survived  7 widgets are free\n");
});

test("B28: doesn't count a test whose title starts with another scenario's ID", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile(
    "src/widgets/widgets.service.test.ts",
    `import { expect, test } from "vitest";
import { priceOf } from "./widgets.ts";

test("B1: costs something", () => {
  expect(priceOf(3)).toBeGreaterThan(0);
});

test("B2: costs 2 each", () => {
  expect(priceOf(3)).toBe(6);
});
`,
  );
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [TIMES_THREE] } });

  const { output } = replay(["widgets"], repo.root);

  expect(output).toContain("    survived  the price is 3 each\n");
});

test("B21: reports a stale mutant without planting it", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", {
    B1: {
      then: "Costs 2 each",
      mutants: [
        { ...TIMES_THREE, breaks: "the price is 4 each", find: ["  return quantity * 4;"] },
      ],
    },
  });

  expect(replay(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B1  Costs 2 each",
      "    stale     the price is 4 each: find must appear exactly once in src/widgets/widgets.ts",
      "spec:mutants failed · 1 problems",
      "",
    ].join("\n"),
  });
});

test("B22: prints each scenario's Then, then each mutant as killed or survived, and fails on a survivor", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", {
    B1: { then: "Costs 2 each", mutants: [TIMES_THREE, FREE_AT_SEVEN] },
  });

  expect(replay(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B1  Costs 2 each",
      "    killed    the price is 3 each",
      "    survived  7 widgets are free",
      "spec:mutants failed · 1 problems",
      "",
    ].join("\n"),
  });
});

test("B29: passes when every mutant is killed", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.service.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [TIMES_THREE] } });

  expect(replay(["widgets"], repo.root)).toEqual({
    exitCode: 0,
    output: "B1  Costs 2 each\n    killed    the price is 3 each\nspec:mutants passed\n",
  });
});

test("B25: never changes a file under src/ on disk", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile(
    "src/widgets/widgets.service.test.ts",
    `import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("B1: the source on disk is never mutated", () => {
  expect(readFileSync(new URL("./widgets.ts", import.meta.url), "utf8")).toBe(${JSON.stringify(PRICES)});
});
`,
  );
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [TIMES_THREE] } });

  const { output } = replay(["widgets"], repo.root);

  expect(output).toContain("    survived  the price is 3 each\n");
  expect(repo.readFile("src/widgets/widgets.ts")).toBe(PRICES);
});
