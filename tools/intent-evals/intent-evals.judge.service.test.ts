import { join } from "node:path";
import { expect, test } from "vitest";
import type { EvalCase } from "./cases.ts";
import {
  additionalCheck,
  checklist,
  fakeClaudeClient,
  read,
  readResult,
  replied,
  stopped,
  streamed,
  unmetRequirement,
} from "./fake-claude-client.ts";
import { judgeCases } from "./judge-runs.ts";
import { createTempRoot } from "./temp-root.ts";
import { PRICES, PRICES_TESTS, TESTS_FILE, WIDGETS as ONE_SCENARIO } from "./widgets-example.ts";

const WIDGETS = {
  ...ONE_SCENARIO,
  scenarios: [...ONE_SCENARIO.scenarios, ["B2", "Is never free"]] as [string, string][],
};

const CAP_UNCHECKED: EvalCase = {
  id: "judge-001-cap",
  number: "001",
  title: "The test no longer checks the cap",
  example: "widgets",
  kind: "contradicts_requirement",
  difficulty: "easy",
  scenario: "B1",
  quote: "up to 10",
  plant: [{ file: TESTS_FILE, find: ["  expect(priceOf(7)).toBe(10);"], replace: [] }],
};

// Planted after line 6 of the widgets tests, so it's line 7.
const TYPE_CHECKED: EvalCase = {
  id: "judge-002-type",
  number: "002",
  title: "The test checks the price is a number",
  example: "widgets",
  kind: "adds_requirement",
  difficulty: "easy",
  scenario: "B1",
  plant: [
    {
      file: TESTS_FILE,
      find: ["  expect(priceOf(7)).toBe(10);"],
      replace: ["  expect(priceOf(7)).toBe(10);", '  expect(typeof priceOf(1)).toBe("number");'],
    },
  ],
};

const SLOW = { timeout: 60_000 };

/** The runs of one round on `model`, as the report labels them. */
const labelled = (model: string) => [`judge-001-cap ${model}`, `judge-003-weight ${model}`];

const ONCE = { runs: 1, models: ["sonnet"], parallel: 1 };

test(
  "B9: judges each case --runs times on each model, alone in a copy of its example with its plant applied",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    repo.writeExample("gadgets", {
      scenarios: [["B1", "Weighs 3 each"]],
      code: "export const weight = 3;\n",
      tests: 'test("B1: weighs 3 each", () => {\n  expect(weight).toBe(3);\n});\n',
    });
    const gadgetCase: EvalCase = {
      ...CAP_UNCHECKED,
      id: "judge-003-weight",
      number: "003",
      example: "gadgets",
      plant: [
        {
          file: "src/gadgets/gadgets.service.test.ts",
          find: ["  expect(weight).toBe(3);"],
          replace: [],
        },
      ],
    };
    const claude = fakeClaudeClient();

    const runs = await judgeCases(
      repo.root,
      [CAP_UNCHECKED, gadgetCase],
      { runs: 2, models: ["sonnet", "opus"], parallel: 1 },
      claude.run,
    );

    const widgets = "Judge the tests of the widgets spec. Judge only B1.";
    const gadgets = "Judge the tests of the gadgets spec. Judge only B1.";
    const round = (model: string) => [
      [widgets, model],
      [gadgets, model],
    ];
    expect(claude.calls.map(({ prompt, model }) => [prompt, model])).toEqual([
      ...round("sonnet"),
      ...round("opus"),
      ...round("sonnet"),
      ...round("opus"),
    ]);
    expect(claude.calls[0]?.files).toEqual({
      "specs/modules/widgets/spec.md": expect.stringContaining("| B2 |"),
      "src/widgets/widgets.ts": PRICES,
      [TESTS_FILE]: PRICES_TESTS.replace("  expect(priceOf(7)).toBe(10);\n", "\n"),
    });
    expect(claude.calls[1]?.files).toEqual({
      "specs/modules/gadgets/spec.md": expect.stringContaining("| B1 |"),
      "src/gadgets/gadgets.ts": "export const weight = 3;\n",
      "src/gadgets/gadgets.service.test.ts": 'test("B1: weighs 3 each", () => {\n\n});\n',
    });
    expect(runs.map(({ evalCase, model }) => `${evalCase.id} ${model}`)).toEqual([
      ...labelled("sonnet"),
      ...labelled("opus"),
      ...labelled("sonnet"),
      ...labelled("opus"),
    ]);
  },
);

test.each([
  ["**Up  to `10`**", "B1", "found"],
  ['"up to 10", so 7 widgets cost 10', "B1", "found"],
  ["up to 10", "B2", "not found"],
  ["costs 2 each", "B1", "not found"],
])(
  "B10: a problem saying %j on %s, for a case quoting up to 10 on B1, is %s",
  SLOW,
  async (says, scenario, outcome) => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(checklist([unmetRequirement(says, { scenario })], []));

    const [run] = await judgeCases(repo.root, [CAP_UNCHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe(outcome);
  },
);

test.each([
  [TESTS_FILE, 7, "found"],
  [TESTS_FILE, 6, "not found"],
  ["src/widgets/widgets.ts", 7, "not found"],
  [TESTS_FILE, null, "not found"],
])(
  "B10: an added check on B1 at %s line %s, for a requirement planted at line 7, is %s",
  SLOW,
  async (file, line, outcome) => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(checklist([], [additionalCheck("a type", { file, line })]));

    const [run] = await judgeCases(repo.root, [TYPE_CHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe(outcome);
  },
);

test(
  "B10: an added requirement's test line counts when the judge names it by its path in the copy",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith((directory) =>
      checklist([], [additionalCheck("a type", { file: join(directory, TESTS_FILE), line: 7 })]),
    );

    const [run] = await judgeCases(repo.root, [TYPE_CHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe("found");
  },
);

test.each([
  ["a requirement judged aligned", [unmetRequirement("up to 10", { verdict: "aligned" })], []],
  [
    "a check judged setup_only",
    [],
    [additionalCheck("a type", { file: TESTS_FILE, line: 7, verdict: "setup_only" })],
  ],
  [
    "a check judged boundary_of_requirement",
    [],
    [additionalCheck("a type", { file: TESTS_FILE, line: 7, verdict: "boundary_of_requirement" })],
  ],
])(
  "B26: %s is not a problem, so a planted case's run is not found",
  SLOW,
  async (_, requirements, checks) => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(checklist(requirements, checks));

    const [run] = await judgeCases(repo.root, [TYPE_CHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe("not found");
    expect(run?.problems).toEqual([]);
  },
);

test.each([
  [
    "a reply that doesn't match the reply schema",
    streamed(replied({ requirements: "none", additional_checks: [] })),
    "the reply doesn't match the reply schema",
    0.3,
  ],
  [
    "claude not running",
    { messages: [], seconds: 0, error: "claude stopped: spawn claude ENOENT" },
    "claude stopped: spawn claude ENOENT",
    0,
  ],
  [
    "claude failing",
    streamed({ type: "result", subtype: "success", is_error: true, result: "API Error: 500" }),
    "API Error: 500",
    0,
  ],
  [
    "claude stopping at an error",
    streamed(stopped("error_max_turns", "Reached 40 turns", 1.2)),
    "Reached 40 turns",
    1.2,
  ],
  ["claude ending without a result", streamed(), "claude ended without a result", 0],
  [
    "the $2 spending limit",
    streamed(stopped("error_max_budget_usd", "Reached maximum budget ($2)", 2.04)),
    "the call reached its $2 spending limit",
    2.04,
  ],
])(
  "B11: a run ending in %s is broken, and keeps what it cost",
  SLOW,
  async (_, reply, failure, costUsd) => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(reply);

    const [run] = await judgeCases(repo.root, [CAP_UNCHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe("broken");
    expect(run?.failure).toContain(failure);
    expect(run?.costUsd).toBe(costUsd);
  },
);

test(
  "B12: a run that read the code under test is a forbidden read, even if it found the gap",
  SLOW,
  async () => {
    using repo = createTempRoot();
    repo.writeExample("widgets", WIDGETS);
    const claude = fakeClaudeClient();
    claude.replyWith(
      streamed(
        read("read-1", "src/widgets/widgets.ts"),
        readResult("read-1", false),
        replied({ requirements: [unmetRequirement("up to 10")], additional_checks: [] }),
      ),
    );

    const [run] = await judgeCases(repo.root, [CAP_UNCHECKED], ONCE, claude.run);

    expect(run?.outcome).toBe("forbidden read");
    expect(run?.failure).toBe(
      'the guard let a forbidden Read through: {"file_path":"src/widgets/widgets.ts"}',
    );
  },
);

test("B12: a read the guard refused is not a forbidden read", SLOW, async () => {
  using repo = createTempRoot();
  repo.writeExample("widgets", WIDGETS);
  const claude = fakeClaudeClient();
  claude.replyWith(
    streamed(
      read("read-1", "src/widgets/widgets.ts"),
      readResult("read-1", true),
      replied({ requirements: [unmetRequirement("up to 10")], additional_checks: [] }),
    ),
  );

  const [run] = await judgeCases(repo.root, [CAP_UNCHECKED], ONCE, claude.run);

  expect(run?.outcome).toBe("found");
});
