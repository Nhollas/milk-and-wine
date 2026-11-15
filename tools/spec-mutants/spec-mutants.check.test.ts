// oxlint-disable unicorn/no-thenable -- mutants.json names each scenario's Then column `then`
import { expect, test } from "vitest";
import { check } from "./check.ts";
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

test("B1: reports an unknown subject", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);

  expect(check(["gadgets"], repo.root)).toEqual({
    exitCode: 1,
    output: "unknown subject: gadgets\n",
  });
});

test("B26: reports a missing mutants.json", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);

  expect(check(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: "no mutants for widgets: expected specs/modules/widgets/mutants.json\n",
  });
});

test("B2: reports a mutants.json that doesn't match the schema", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeMutants("widgets", {
    B1: { then: "Costs 2 each", mutants: [{ breaks: "the price is wrong", find: ["x"] }] },
  });

  const { exitCode, output } = check(["widgets"], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^specs\/modules\/widgets\/mutants\.json is not valid:.*B1\.mutants\[0\]\.file/su,
  );
});

test("B3: plants nothing when src/ doesn't typecheck", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", `export const price: number = "two";\n`);
  repo.writeMutants("widgets", {
    B1: {
      then: "Costs 2 each",
      mutants: [
        {
          breaks: "the price is wrong",
          file: "src/widgets/widgets.ts",
          find: [`export const price: number = "two";`],
          replace: [`export const price: number = "three";`],
        },
      ],
    },
  });

  const { exitCode, output } = check(["widgets"], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(/^src\/ must typecheck before any mutant is planted:\n.*TS2322/su);
  expect(output).not.toContain("the price is wrong");
});

test("B4: reports an ID the spec lacks", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeMutants("widgets", { B9: { then: "Is free", mutants: [] } });

  expect(check(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B9  unknown-id     not a scenario of widgets",
      "no mutants yet: B1",
      "spec:mutants:check failed · 1 problems",
      "",
    ].join("\n"),
  });
});

test("B6: reports a mutant whose find lines don't appear exactly once, or whose file is gone", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeMutants("widgets", {
    B1: {
      then: "Costs 2 each",
      mutants: [
        {
          breaks: "the price is 3 each",
          file: "src/widgets/widgets.ts",
          find: ["  return quantity * 4;"],
          replace: ["  return quantity * 3;"],
        },
        {
          breaks: "the price is free",
          file: "src/widgets/gone.ts",
          find: ["  return quantity * 2;"],
          replace: ["  return 0;"],
        },
      ],
    },
  });

  expect(check(["widgets"], repo.root)).toEqual({
    exitCode: 1,
    output: [
      "B1  stale          the price is 3 each: find must appear exactly once in src/widgets/widgets.ts",
      "B1  stale          the price is free: find must appear exactly once in src/widgets/gone.ts",
      "spec:mutants:check failed · 2 problems",
      "",
    ].join("\n"),
  });
});

test("B10: reports a mutant that doesn't typecheck when planted", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeMutants("widgets", {
    B1: {
      then: "Costs 2 each",
      mutants: [
        {
          breaks: "the price is a word",
          file: "src/widgets/widgets.ts",
          find: ["  return quantity * 2;"],
          replace: [`  return "two";`],
        },
      ],
    },
  });

  const { exitCode, output } = check(["widgets"], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(/^B1 {2}compile-error {2}the price is a word\n.*TS2322/su);
  expect(repo.readFile("src/widgets/widgets.ts")).toBe(PRICES);
});

test("B12: lists scenarios with no mutants yet, without failing", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [
    ["B1", "Costs 2 each"],
    ["B2", "Is never negative"],
  ]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeMutants("widgets", { B1: { then: "Costs 2 each", mutants: [] } });

  expect(check(["widgets"], repo.root)).toEqual({
    exitCode: 0,
    output: "no mutants yet: B2\nspec:mutants:check passed\n",
  });
});

test("B13: passes when every mutant is ok", () => {
  using repo = createTempRepo();
  repo.writeSpec("widgets", [["B1", "Costs 2 each"]]);
  repo.writeFile("src/widgets/widgets.ts", PRICES);
  repo.writeFile("src/widgets/widgets.test.ts", PRICES_TESTS);
  repo.writeMutants("widgets", {
    B1: {
      then: "Costs 2 each",
      mutants: [
        {
          breaks: "the price is 3 each",
          file: "src/widgets/widgets.ts",
          find: ["  return quantity * 2;"],
          replace: ["  return quantity * 3;"],
        },
      ],
    },
  });

  expect(check(["widgets"], repo.root)).toEqual({
    exitCode: 0,
    output: "B1  ok             the price is 3 each\nspec:mutants:check passed\n",
  });
});
