import { expect, test } from "vitest";
import { check } from "./check-cases.ts";
import { createTempRoot } from "./temp-root.ts";
import { NO_CAP, NO_CAP_CHECK, PRICES, PRICES_TESTS, WIDGETS } from "./widgets-example.ts";

const SLOW = { timeout: 120_000 };

const CAP_UNCHECKED = {
  example: "widgets",
  scenario: "B1",
  kind: "misses_requirement",
  difficulty: "easy",
  quote: "up to 10",
  plant: [NO_CAP_CHECK],
  bug: NO_CAP,
};

test("B1: reports a misnamed case folder", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("b1-cap", CAP_UNCHECKED);

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^\.claude\/skills\/intent-judge\/evals\/b1-cap is not valid:\nthe folder must be named judge-<number>-<slug>\n/su,
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B27: reports a case without a README heading", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-003-no-heading", CAP_UNCHECKED, "The cap is never checked.\n");

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^\.claude\/skills\/intent-judge\/evals\/judge-003-no-heading is not valid:\nREADME\.md must start with a # heading\n/su,
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B28: reports a case whose JSON doesn't match the format", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-001-weakened", { ...CAP_UNCHECKED, kind: "weakened" });
  repo.writeCase("judge-002-not-json", "{ not json");

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^\.claude\/skills\/intent-judge\/evals\/judge-001-weakened is not valid:\nplant\.json: .*kind.*\n\.claude\/skills\/intent-judge\/evals\/judge-002-not-json is not valid:\nplant\.json: .*\n/su,
  );
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test("B29: reports two cases sharing a number", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-001-cap", CAP_UNCHECKED);
  repo.writeCase("judge-001-cap-again", CAP_UNCHECKED);

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-cap        duplicate  number 001 is used twice\n");
  expect(output).toContain("judge-001-cap-again  duplicate  number 001 is used twice\n");
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test("B2: reports a case naming an example or a scenario that doesn't exist", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-001-cap", { ...CAP_UNCHECKED, example: "gadgets" });
  repo.writeCase("judge-002-cap", { ...CAP_UNCHECKED, scenario: "B9" });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-001-cap  unknown    no example at .claude/skills/intent-judge/evals/examples/gadgets\n",
  );
  expect(output).toContain(
    "judge-002-cap  unknown    widgets has no scenario B9 verified by a test\n",
  );
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test(
  "B3: reports a case whose find lines don't appear exactly once, or whose file is gone",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    repo.writeCase("judge-001-twice", {
      ...CAP_UNCHECKED,
      plant: [{ ...NO_CAP_CHECK, find: ["  expect(priceOf("] }],
    });
    repo.writeCase("judge-002-gone", {
      ...CAP_UNCHECKED,
      bug: { ...NO_CAP, file: "src/widgets/gone.ts" },
    });

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain(
      "judge-001-twice  stale      find must appear exactly once in src/widgets/widgets.service.test.ts\n",
    );
    expect(output).toContain(
      "judge-002-gone   stale      find must appear exactly once in src/widgets/gone.ts\n",
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
    repo.writeCase("judge-001-cap", CAP_UNCHECKED);

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toBe(
      [
        'widgets: tests must pass as they are, but "B1: costs 2 each, up to 10" fails, B2 has no test',
        "eval:check failed · 1 problems",
        "",
      ].join("\n"),
    );
  },
);

test("B5: a bug the tests miss alone is not a gap", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-001-harmless", {
    ...CAP_UNCHECKED,
    bug: { ...NO_CAP, replace: ["  return Math.min(quantity * 2, 10) + 0;"] },
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-harmless  not a gap  the tests pass with the bug alone\n");
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B30: a bug the tests still catch once the gap is planted is not a gap", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-002-still-caught", {
    ...CAP_UNCHECKED,
    kind: "checks_something_else",
    plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(7)).toBeLessThanOrEqual(10);"] }],
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-002-still-caught  not a gap  the tests still fail once the gap is planted\n",
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B6: a contradiction the tests don't fail on is not a gap", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  const contradicts = {
    example: "widgets",
    scenario: "B1",
    kind: "contradicts_requirement",
    difficulty: "easy",
    quote: "up to 10",
  };
  repo.writeCase("judge-001-agrees", {
    ...contradicts,
    plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(8)).toBe(10);"] }],
  });
  repo.writeCase(
    "judge-002-no-cap",
    { ...contradicts, plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(7)).toBe(14);"] }] },
    "# The test expects 7 widgets to cost 14\n",
  );
  repo.writeCase("judge-003-broken", {
    ...contradicts,
    plant: [{ ...NO_CAP_CHECK, replace: ["  this is not typescript((("] }],
  });
  repo.writeCase("judge-004-renamed", {
    ...contradicts,
    plant: [
      {
        ...NO_CAP_CHECK,
        find: ['test("B1: costs 2 each, up to 10", () => {'],
        replace: ['test("costs 2 each, up to 10", () => {'],
      },
    ],
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-001-agrees   not a gap  the tests don't fail with the contradiction planted\n",
  );
  expect(output).toContain(
    "judge-002-no-cap   ok         contradicts_requirement, easy: The test expects 7 widgets to cost 14\n",
  );
  expect(output).toContain(
    "judge-003-broken   not a gap  the tests don't fail with the contradiction planted\n",
  );
  expect(output).toContain(
    "judge-004-renamed  not a gap  the tests don't fail with the contradiction planted\n",
  );
  expect(output).toMatch(/eval:check failed · 3 problems\n$/u);
});

test(
  "B25: a tests_are_right case whose plant breaks the tests fails, and one that keeps them passing is ok",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const right = {
      example: "widgets",
      scenario: "B1",
      kind: "tests_are_right",
      difficulty: "easy",
    };
    repo.writeCase("judge-001-breaks", {
      ...right,
      plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(8)).toBe(14);"] }],
    });
    repo.writeCase(
      "judge-002-at-eight",
      { ...right, plant: [{ ...NO_CAP_CHECK, replace: ["  expect(priceOf(8)).toBe(10);"] }] },
      "# The cap is checked at 8\n\nA judge may call 8 an odd quantity.\n",
    );
    repo.writeCase("judge-003-as-is", right, "# The cap is checked at 7\n");

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain("judge-001-breaks    fails      the tests fail with the plant\n");
    expect(output).toContain(
      "judge-002-at-eight  ok         tests_are_right, easy: The cap is checked at 8\n",
    );
    expect(output).toContain(
      "judge-003-as-is     ok         tests_are_right, easy: The cap is checked at 7\n",
    );
    expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
  },
);

test("B8: prints each case's kind, difficulty and title, and passes", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  repo.writeCase("judge-001-cap", CAP_UNCHECKED, "# The cap is never checked\n\nMore about it.\n");
  repo.writeCase("judge-002-cap-again", CAP_UNCHECKED, "# The cap is never checked\n");
  repo.writeCase(
    "judge-003-off-by-one",
    {
      example: "widgets",
      scenario: "B1",
      kind: "adds_requirement",
      difficulty: "easy",
      plant: [
        {
          ...NO_CAP_CHECK,
          replace: ["  expect(priceOf(7)).toBe(10);", "  expect(priceOf(8)).toBe(10);"],
        },
      ],
    },
    "# The test checks 8 widgets, which B1 never mentions\n",
  );

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(0);
  expect(output).toMatch(
    /^judge-001-cap {9}ok {9}misses_requirement, easy: The cap is never checked\njudge-002-cap-again {3}ok {9}misses_requirement, easy: The cap is never checked\njudge-003-off-by-one {2}ok {9}adds_requirement, easy: The test checks 8 widgets, which B1 never mentions\neval:check passed\n$/su,
  );
});
