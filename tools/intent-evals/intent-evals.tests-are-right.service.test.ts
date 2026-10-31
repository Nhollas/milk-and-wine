import { join } from "node:path";
import { expect, test } from "vitest";
import type { EvalCase } from "./cases.ts";
import { checklist, fakeClaudeClient, unalignedPart } from "./fake-claude-client.ts";
import { judgeCases } from "./judge-runs.ts";
import { createTempRoot } from "./temp-root.ts";

const PRICES_TESTS =
  'test("B1: costs 2 each, up to 10", () => {\n  expect(priceOf(7)).toBe(10);\n});\n';

const WIDGETS = {
  scenarios: [
    ["B1", "Costs 2 each, up to 10"],
    ["B2", "Is never free"],
  ] as [string, string][],
  code: "export const priceOf = (quantity: number) => Math.min(quantity * 2, 10);\n",
  tests: PRICES_TESTS,
};

const TESTS_FILE = "src/widgets/widgets.service.test.ts";

const CAP_RIGHT: EvalCase = {
  id: "judge-001-cap-at-seven",
  number: "001",
  title: "The cap is checked at 7",
  example: "widgets",
  kind: "tests-are-right",
  difficulty: "easy",
  scenario: "B1",
  plant: [],
};

const SLOW = { timeout: 60_000 };

const ONCE = { runs: 1, models: ["sonnet"], parallel: 1 };

test(
  "B9, B13: a tests-are-right case runs on its example as it is, and is clean when nothing is reported",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(checklist([], []));

    const [run] = await judgeCases(repo.root, [CAP_RIGHT], ONCE, claude.run);

    expect(claude.calls[0]?.prompt).toBe("Judge the tests of the widgets spec. Judge only B1.");
    expect(claude.calls[0]?.files[TESTS_FILE]).toBe(PRICES_TESTS);
    expect(run?.outcome).toBe("clean");
  },
);

test(
  "B13: a tests-are-right case's run that reports anything is a false positive, and keeps its problems",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith((directory) =>
      checklist(
        [unalignedPart("up to 10", { checkedBy: join(directory, `${TESTS_FILE}:2`) })],
        [{ scenario: "B1", checks: "a type", where: `${TESTS_FILE}:3` }],
      ),
    );

    const [run] = await judgeCases(repo.root, [CAP_RIGHT], ONCE, claude.run);

    expect(run?.outcome).toBe("false positive");
    expect(run?.problems).toEqual([
      { scenario: "B1", says: "up to 10", where: `${TESTS_FILE}:2` },
      { scenario: "B1", says: "a type", where: `${TESTS_FILE}:3` },
    ]);
  },
);
