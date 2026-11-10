import { expect, test } from "vitest";
import { check } from "./check.ts";
import { createTempRoot } from "./temp-root.ts";
import {
  CAP_UNCHECKED,
  CODE_PATH,
  EASY,
  NO_CAP,
  NO_CAP_CHECK,
  SPEC_PATH,
  WIDGETS,
} from "./widgets-fixture.ts";

const SLOW = { timeout: 120_000 };

test("B1: reports a misnamed task folder", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("b1-cap", CAP_UNCHECKED);

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^evals\/intent-judge\/b1-cap is not valid:\nthe folder must be named judge-<number>-<slug>\n/su,
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test("B27: reports a task without a README heading", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-003-no-heading", CAP_UNCHECKED, "The cap is never checked.\n");

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toMatch(
    /^evals\/intent-judge\/judge-003-no-heading is not valid:\nREADME\.md must start with a # heading\n/su,
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});

test(
  "B28: reports a task whose task.toml or expected.json doesn't match the format, or that lacks its bug",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeFixture("widgets", WIDGETS);
    repo.writeTask("judge-001-tricky", {
      ...CAP_UNCHECKED,
      taskToml: EASY.replace('"easy"', '"tricky"'),
    });
    repo.writeTask("judge-002-weakened", {
      ...CAP_UNCHECKED,
      expected: { scenario: "B1", verdict: "weakened", requirement: "up to 10" },
    });
    repo.writeTask("judge-003-not-json", { ...CAP_UNCHECKED, expected: "{ not json" });
    const { bug: _bug, ...withoutBug } = CAP_UNCHECKED;
    repo.writeTask("judge-004-no-bug", withoutBug);

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toMatch(
      /^evals\/intent-judge\/judge-001-tricky is not valid:\ntask\.toml: .*difficulty.*\nevals\/intent-judge\/judge-002-weakened is not valid:\ntests\/expected\.json: .*verdict.*\nevals\/intent-judge\/judge-003-not-json is not valid:\ntests\/expected\.json: .*\nevals\/intent-judge\/judge-004-no-bug is not valid:\nbug\/ must hold the code change that misses_requirement lets through\n/su,
    );
    expect(output).toMatch(/eval:check failed · 4 problems\n$/u);
  },
);

test("B29: reports two tasks sharing a number", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-001-cap", CAP_UNCHECKED);
  repo.writeTask("judge-001-cap-again", CAP_UNCHECKED);

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain("judge-001-cap        duplicate  number 001 is used twice\n");
  expect(output).toContain("judge-001-cap-again  duplicate  number 001 is used twice\n");
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test("B2: reports a task naming a fixture or a scenario that doesn't exist", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-001-cap", {
    ...CAP_UNCHECKED,
    taskToml: EASY.replace('"widgets"', '"gadgets"'),
  });
  repo.writeTask("judge-002-cap", {
    ...CAP_UNCHECKED,
    expected: { ...CAP_UNCHECKED.expected, scenario: "B9" },
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-001-cap  unknown    no fixture at evals/intent-judge/fixtures/gadgets\n",
  );
  expect(output).toContain(
    "judge-002-cap  unknown    widgets has no scenario B9 verified by a test\n",
  );
  expect(output).toMatch(/eval:check failed · 2 problems\n$/u);
});

test(
  "B3: reports a task whose copies of its fixture hold a file it doesn't, or a spec that differs",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeFixture("widgets", WIDGETS);
    repo.writeTask("judge-001-extra", {
      ...CAP_UNCHECKED,
      environment: { ...CAP_UNCHECKED.environment, "notes.md": "The cap is the trap.\n" },
    });
    repo.writeTask("judge-002-old-spec", {
      ...CAP_UNCHECKED,
      environment: { ...CAP_UNCHECKED.environment, [SPEC_PATH]: "# widgets\n" },
    });
    repo.writeTask("judge-003-tested-bug", {
      ...CAP_UNCHECKED,
      bug: { "src/widgets/widgets.service.test.ts": NO_CAP_CHECK },
    });

    const { exitCode, output } = await check(repo.root);

    expect(exitCode).toBe(1);
    expect(output).toContain(
      "judge-001-extra       stale      environment/notes.md is not in widgets\n",
    );
    expect(output).toContain(
      "judge-002-old-spec    stale      environment/specs/modules/widgets/spec.md differs from widgets's\n",
    );
    expect(output).toContain(
      "judge-003-tested-bug  stale      bug/src/widgets/widgets.service.test.ts is not code under test in widgets\n",
    );
    expect(output).toMatch(/eval:check failed · 3 problems\n$/u);
  },
);

test("B31: reports a task whose environment holds code under test", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeFixture("widgets", WIDGETS);
  repo.writeTask("judge-001-leaky", {
    ...CAP_UNCHECKED,
    environment: { ...CAP_UNCHECKED.environment, [CODE_PATH]: NO_CAP },
  });

  const { exitCode, output } = await check(repo.root);

  expect(exitCode).toBe(1);
  expect(output).toContain(
    "judge-001-leaky  leaks      environment/src/widgets/widgets.ts is code under test\n",
  );
  expect(output).toMatch(/eval:check failed · 1 problems\n$/u);
});
