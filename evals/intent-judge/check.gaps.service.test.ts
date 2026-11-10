import { expect, test } from "vitest";
import { check } from "./check.ts";
import { createTempRoot } from "./temp-root.ts";
import {
  aligned,
  CAP_UNCHECKED,
  CODE_PATH,
  contradicts,
  EASY,
  environmentWith,
  PRICES_TESTS,
  replacingCapCheck,
  WIDGETS,
} from "./widgets-fixture.ts";

const SLOW = { timeout: 120_000 };

test(
  "B4: checks none of a fixture's tasks while its tests fail or a scenario has none",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeFixture("widgets", {
      scenarios: [
        ["B1", "Costs 2 each, up to 10"],
        ["B2", "Is never free"],
        ["B3", "Is checked by hand", "manual [the till](../../till.md)"],
      ],
      code: WIDGETS.code,
      tests: PRICES_TESTS.replace("toBe(6)", "toBe(7)"),
    });
    repo.writeTask("judge-001-cap", CAP_UNCHECKED);

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
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-001-harmless", {
    ...CAP_UNCHECKED,
    bug: { [CODE_PATH]: WIDGETS.code.replace("10);", "10) + 0;") },
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-harmless  not a gap  the tests pass with the bug alone\n");
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B30: a bug the tests still catch once the gap is planted is not a gap", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-002-still-caught", {
    ...CAP_UNCHECKED,
    expected: { scenario: "B1", verdict: "checks_something_else", requirement: "up to 10" },
    environment: environmentWith(
      PRICES_TESTS.replace(
        "expect(priceOf(7)).toBe(10)",
        "expect(priceOf(7)).toBeLessThanOrEqual(10)",
      ),
    ),
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
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask(
    "judge-001-agrees",
    contradicts(replacingCapCheck("  expect(priceOf(8)).toBe(10);")),
  );
  repo.writeTask(
    "judge-002-no-cap",
    contradicts(replacingCapCheck("  expect(priceOf(7)).toBe(14);")),
    "# The test expects 7 widgets to cost 14\n",
  );
  repo.writeTask("judge-003-broken", contradicts(replacingCapCheck("  this is not typescript(((")));
  repo.writeTask(
    "judge-004-renamed",
    contradicts(PRICES_TESTS.replace('test("B1: costs', 'test("costs')),
  );

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
  "B25: an aligned task whose tests fail against the fixture's code fails, and one whose tests pass is ok",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeFixture("widgets", WIDGETS);
    repo.writeTask(
      "judge-001-breaks",
      aligned(PRICES_TESTS.replace("expect(priceOf(7)).toBe(10)", "expect(priceOf(8)).toBe(14)")),
    );
    repo.writeTask(
      "judge-002-at-eight",
      aligned(PRICES_TESTS.replace("expect(priceOf(7)).toBe(10)", "expect(priceOf(8)).toBe(10)")),
      "# The cap is checked at 8\n\nA judge may call 8 an odd quantity.\n",
    );
    repo.writeTask("judge-003-as-is", aligned(PRICES_TESTS), "# The cap is checked at 7\n");

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain(
      "judge-001-breaks    fails      the tests fail against the fixture's code\n",
    );
    expect(output).toContain(
      "judge-002-at-eight  ok         aligned, easy: The cap is checked at 8\n",
    );
    expect(output).toContain(
      "judge-003-as-is     ok         aligned, easy: The cap is checked at 7\n",
    );
    expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
  },
);

test(
  "B8: prints each task's expected verdict, difficulty and title, and passes",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeFixture("widgets", WIDGETS);
    repo.writeTask(
      "judge-001-cap",
      CAP_UNCHECKED,
      "# The cap is never checked\n\nMore about it.\n",
    );
    repo.writeTask("judge-002-cap-again", CAP_UNCHECKED, "# The cap is never checked\n");
    repo.writeTask(
      "judge-003-off-by-one",
      {
        taskToml: EASY,
        expected: { scenario: "B1", verdict: "adds_requirement", test_line: 6 },
        environment: environmentWith(
          PRICES_TESTS.replace(
            "  expect(priceOf(7)).toBe(10);",
            "  expect(priceOf(7)).toBe(10);\n  expect(priceOf(8)).toBe(10);",
          ),
        ),
      },
      "# The test checks 8 widgets, which B1 never mentions\n",
    );

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(0);
    expect(output).toMatch(
      /^judge-001-cap {9}ok {9}misses_requirement, easy: The cap is never checked\njudge-002-cap-again {3}ok {9}misses_requirement, easy: The cap is never checked\njudge-003-off-by-one {2}ok {9}adds_requirement, easy: The test checks 8 widgets, which B1 never mentions\neval:check passed\n$/su,
    );
  },
);
