import { expect, test } from "vitest";
import { check } from "./check.ts";
import { createTempRoot } from "./temp-root.ts";

const SLOW = { timeout: 120_000 };

const PRICES = `export function priceOf(quantity: number): number {
  return Math.min(quantity * 2, 10);
}
`;

const PRICES_TESTS = `import { expect, test } from "vitest";
import { priceOf } from "./widgets.ts";

test("B1: costs 2 each, up to 10", () => {
  expect(priceOf(3)).toBe(6);
  expect(priceOf(7)).toBe(10);
});
`;

const WIDGETS = {
  scenarios: [["B1", "Costs 2 each, up to 10"]] as [string, string][],
  code: PRICES,
  tests: PRICES_TESTS,
};

const NO_CAP_CHECK = {
  file: "src/widgets/widgets.service.test.ts",
  find: ["  expect(priceOf(7)).toBe(10);"],
  replace: [],
};

const NO_CAP = {
  file: "src/widgets/widgets.ts",
  find: ["  return Math.min(quantity * 2, 10);"],
  replace: ["  return quantity * 2;"],
};

const CAP_UNCHECKED = {
  gap: "B1's test no longer checks the cap",
  kind: "unchecked",
  difficulty: "easy",
  scenario: "B1",
  quote: "up to 10",
  plant: [NO_CAP_CHECK],
  bug: NO_CAP,
};

test("B1: reports a case file that doesn't match the case schema", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("widgets", "b1-weakened", { ...CAP_UNCHECKED, kind: "weakened" });
  repo.writeCase("widgets", "b1-not-json", "{ not json");

  const { exitCode, output } = await check([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^tools\/intent-evals\/cases\/widgets\/b1-not-json\.json is not valid:\n.*\ntools\/intent-evals\/cases\/widgets\/b1-weakened\.json is not valid:\n.*kind/su,
  );
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test("B2: reports a case naming an example or a scenario that doesn't exist", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("gadgets", "b1-cap", CAP_UNCHECKED);
  repo.writeCase("widgets", "b9-cap", { ...CAP_UNCHECKED, scenario: "B9" });

  const { exitCode, output } = await check([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "gadgets/b1-cap  unknown    no example at tools/intent-evals/examples/gadgets\n",
  );
  expect(output).toContain(
    "widgets/b9-cap  unknown    widgets has no scenario B9 verified by a test\n",
  );
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test(
  "B3: reports a case whose find lines don't appear exactly once, or whose file is gone",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    repo.writeCase("widgets", "b1-twice", {
      ...CAP_UNCHECKED,
      plant: [{ ...NO_CAP_CHECK, find: ["  expect(priceOf("] }],
    });
    repo.writeCase("widgets", "b1-gone", {
      ...CAP_UNCHECKED,
      bug: { ...NO_CAP, file: "src/widgets/gone.ts" },
    });

    const { exitCode, output } = await check([], repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain(
      "widgets/b1-gone   stale      find must appear exactly once in src/widgets/gone.ts\n",
    );
    expect(output).toContain(
      "widgets/b1-twice  stale      find must appear exactly once in src/widgets/widgets.service.test.ts\n",
    );
    expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
  },
);

test(
  "B4: checks none of an example's cases while its tests fail or a scenario has none",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", {
      scenarios: [
        ["B1", "Costs 2 each, up to 10"],
        ["B2", "Is never free"],
        ["B3", "Is checked by hand", "manual [the till](../../till.md)"],
      ],
      code: PRICES,
      tests: PRICES_TESTS.replace("toBe(6)", "toBe(7)"),
    });
    repo.writeCase("widgets", "b1-cap", CAP_UNCHECKED);

    const { exitCode, output } = await check([], repo.root);

    expect(exitCode).toBe(1);
    expect(output).toBe(
      [
        'widgets: tests must pass as they are, but "B1: costs 2 each, up to 10" fails, B2 has no test',
        "too few cases: unchecked easy (1), unchecked medium (0), unchecked hard (0), wrong thing checked easy (0), wrong thing checked medium (0), wrong thing checked hard (0), setup can't show it easy (0), setup can't show it medium (0), setup can't show it hard (0), contradicted easy (0), contradicted medium (0), contradicted hard (0), unasked easy (0), unasked medium (0), unasked hard (0)",
        "eval:check failed · 1 problems",
        "",
      ].join("\n"),
    );
  },
);

test(
  "B5: a bug the tests miss alone, or still catch once the gap is planted, is not a gap",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    repo.writeCase("widgets", "b1-harmless-bug", {
      ...CAP_UNCHECKED,
      bug: { ...NO_CAP, replace: ["  return Math.min(quantity * 2, 10) + 0;"] },
    });
    repo.writeCase("widgets", "b1-still-caught", {
      ...CAP_UNCHECKED,
      kind: "wrong thing checked",
      plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(7)).toBeLessThanOrEqual(10);"] }],
    });

    const { exitCode, output } = await check([], repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain(
      "widgets/b1-harmless-bug  not a gap  the tests pass with the bug alone\n",
    );
    expect(output).toContain(
      "widgets/b1-still-caught  not a gap  the tests still fail once the gap is planted\n",
    );
    expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
  },
);

test("B6: a contradiction the tests pass as they are is not a gap", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("widgets", "b1-agrees", {
    gap: "B1's test expects the cap to hold",
    kind: "contradicted",
    difficulty: "easy",
    scenario: "B1",
    quote: "up to 10",
    plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(8)).toBe(10);"] }],
  });
  repo.writeCase("widgets", "b1-no-cap", {
    gap: "B1's test expects 7 widgets to cost 14",
    kind: "contradicted",
    difficulty: "easy",
    scenario: "B1",
    quote: "up to 10",
    plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(7)).toBe(14);"] }],
  });

  const { exitCode, output } = await check([], repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "widgets/b1-agrees  not a gap  the tests pass with the contradiction planted\n",
  );
  expect(output).toContain(
    "widgets/b1-no-cap  ok         contradicted, easy: B1's test expects 7 widgets to cost 14\n",
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test(
  "B7: lists each kind and difficulty with fewer than 2 cases, without failing",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    repo.writeCase("widgets", "b1-cap", CAP_UNCHECKED);
    repo.writeCase("widgets", "b1-cap-again", { ...CAP_UNCHECKED, difficulty: "medium" });

    const { exitCode, output } = await check([], repo.root);

    expect(exitCode).toBe(0);
    expect(output).toContain(
      "too few cases: unchecked easy (1), unchecked medium (1), unchecked hard (0), wrong thing checked easy (0),",
    );
  },
);

test("B8: prints each case's kind, difficulty and gap, and passes", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("widgets", "b1-cap", CAP_UNCHECKED);
  repo.writeCase("widgets", "b1-cap-again", CAP_UNCHECKED);
  repo.writeCase("widgets", "b1-off-by-one", {
    gap: "B1's test checks the cap at a price the bug can't reach",
    kind: "unasked",
    difficulty: "easy",
    scenario: "B1",
    reason: "B1 says nothing about 8 widgets",
    plant: [
      {
        ...NO_CAP_CHECK,
        replace: ["  expect(priceOf(7)).toBe(10);", "  expect(priceOf(8)).toBe(10);"],
      },
    ],
  });

  const { exitCode, output } = await check([], repo.root);

  expect(exitCode).toBe(0);
  expect(output).toMatch(
    /^widgets\/b1-cap {9}ok {9}unchecked, easy: B1's test no longer checks the cap\nwidgets\/b1-cap-again {3}ok {9}unchecked, easy: B1's test no longer checks the cap\nwidgets\/b1-off-by-one {2}ok {9}unasked, easy: B1's test checks the cap at a price the bug can't reach\ntoo few cases: .*\neval:check passed\n$/su,
  );
});
