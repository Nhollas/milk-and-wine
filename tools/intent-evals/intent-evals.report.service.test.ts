import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import type { EvalCase } from "./cases.ts";
import { renderRanges, renderReport } from "./report.ts";
import type { Problem, ScoredRun } from "./runs.ts";
import { saveReport } from "./save-report.ts";
import { createTempRoot } from "./temp-root.ts";

function aCase(id: string, kind: EvalCase["kind"], difficulty: EvalCase["difficulty"]): EvalCase {
  const target = {
    id,
    number: id.slice(6, 9),
    title: id,
    example: "widgets",
    difficulty,
    scenario: "B1",
  };
  if (kind === "tests_are_right") return { ...target, kind, plant: [] };
  const planted = { ...target, plant: [] };
  if (kind === "adds_requirement") return { ...planted, kind };
  if (kind === "contradicts_requirement") return { ...planted, kind, quote: "a quote" };
  return { ...planted, kind, quote: "a quote", bug: { file: "a.ts", find: ["a"], replace: [] } };
}

function aRun(
  evalCase: EvalCase,
  outcome: ScoredRun["outcome"],
  fields: Partial<ScoredRun> = {},
): ScoredRun {
  return {
    evalCase,
    model: "sonnet",
    outcome,
    problems: [],
    costUsd: 0,
    seconds: 0,
    failure: undefined,
    transcript: "",
    ...fields,
  };
}

const TESTS_FILE = "src/widgets/widgets.service.test.ts";

const ROUNDED_DOWN: Problem = {
  scenario: "B1",
  verdict: "setup_hides_requirement",
  says: "rounded down",
  file: TESTS_FILE,
  line: 9,
};

const ANY_LINE: Problem = {
  scenario: "B2",
  verdict: "misses_requirement",
  says: "any line",
  file: null,
  line: null,
};

const CAP = aCase("judge-001-cap", "misses_requirement", "easy");
const FREE = aCase("judge-002-free", "contradicts_requirement", "medium");
const ROUNDING = aCase("judge-003-rounding", "adds_requirement", "hard");
const RIGHT = aCase("judge-004-right", "tests_are_right", "easy");

test("B12: lists forbidden-read runs before anything else", () => {
  const runs = [
    aRun(CAP, "found"),
    aRun(FREE, "forbidden read", { model: "opus", failure: "read src/widgets/widgets.ts" }),
  ];

  const report = renderReport(runs, { runsPerCase: 1 });

  expect(report).toMatch(
    /^forbidden read  model  failure\njudge-002-free  opus   read src\/widgets\/widgets\.ts\n\neval:judge/u,
  );
});

test("B14: lists each problem a tests_are_right case's runs reported once under the case, with how many runs reported it", () => {
  const runs = [
    aRun(CAP, "found"),
    aRun(RIGHT, "false positive", { problems: [ROUNDED_DOWN, ANY_LINE] }),
    aRun(RIGHT, "false positive", { problems: [ROUNDED_DOWN] }),
    aRun(RIGHT, "clean"),
  ];

  const report = renderReport(runs, { runsPerCase: 3 });

  expect(report).toContain(
    [
      "judge-004-right  easy        false positives 2/3  ✗ below 95%",
      "",
      "false positives on judge-004-right",
      '  B1 setup_hides_requirement "rounded down" at src/widgets/widgets.service.test.ts:9  ×2',
      '  B2 misses_requirement "any line"',
      "",
      "pass rate",
    ].join("\n"),
  );
});

test("B15: saves the report, the runs and each transcript in a folder labelled with commit, model and date", () => {
  using repo = createTempRoot();
  const runs = [
    aRun(CAP, "found", { transcript: '{"type":"result"}\n', costUsd: 0.5 }),
    aRun(RIGHT, "false positive", {
      model: "opus",
      problems: [ANY_LINE],
      transcript: '{"type":"x"}\n',
    }),
  ];

  const folder = saveReport(repo.root, runs, "the report\n", new Date("2026-10-30T09:15:00Z"));

  expect(folder).toBe("reports/intent-evals/uncommitted-sonnet+opus-2026-10-30T09-15-00.000Z");
  expect(readFileSync(join(repo.root, folder, "report.txt"), "utf8")).toBe("the report\n");
  expect(readdirSync(join(repo.root, folder, "transcripts")).toSorted()).toEqual([
    "1-sonnet-judge-001-cap.jsonl",
    "2-opus-judge-004-right.jsonl",
  ]);
  expect(
    readFileSync(join(repo.root, folder, "transcripts/2-opus-judge-004-right.jsonl"), "utf8"),
  ).toBe('{"type":"x"}\n');
  expect(JSON.parse(readFileSync(join(repo.root, folder, "runs.json"), "utf8"))).toEqual([
    {
      case: "judge-001-cap",
      example: "widgets",
      kind: "misses_requirement",
      difficulty: "easy",
      model: "sonnet",
      outcome: "found",
      problems: [],
      costUsd: 0.5,
      seconds: 0,
      transcript: "transcripts/1-sonnet-judge-001-cap.jsonl",
    },
    {
      case: "judge-004-right",
      example: "widgets",
      kind: "tests_are_right",
      difficulty: "easy",
      model: "opus",
      outcome: "false positive",
      problems: [ANY_LINE],
      costUsd: 0,
      seconds: 0,
      transcript: "transcripts/2-opus-judge-004-right.jsonl",
    },
  ]);
});

test("B15: the saved report carries the 95% range of each difficulty's runs right, which the printed one leaves out", () => {
  const runs = [
    aRun(CAP, "found"),
    aRun(CAP, "found"),
    aRun(CAP, "not found"),
    aRun(RIGHT, "clean"),
    aRun(RIGHT, "false positive", { problems: [ANY_LINE] }),
    aRun(ROUNDING, "found"),
  ];

  const printed = renderReport(runs, { runsPerCase: 3 });
  const ranges = renderRanges(runs);

  expect(printed).not.toContain("%,");
  expect(ranges).toBe(
    [
      "ranges · sonnet",
      "easy runs right  3/5 (60%, 23–88%)",
      "hard runs right  1/1 (100%, 21–100%)",
      "",
    ].join("\n"),
  );
});

test("B16: lists every case with its difficulty, the runs that found it or were false positives, and pass or fail against its mark", () => {
  const runs = [
    aRun(CAP, "found"),
    aRun(CAP, "found"),
    aRun(CAP, "found"),
    aRun(CAP, "found"),
    aRun(CAP, "found"),
    aRun(CAP, "not found"),
    aRun(RIGHT, "clean"),
    aRun(RIGHT, "clean"),
    aRun(FREE, "found"),
    aRun(FREE, "found"),
    aRun(ROUNDING, "broken", { failure: "claude failed" }),
  ];

  const report = renderReport(runs, { runsPerCase: 6 });

  expect(report).toContain(
    [
      "case                difficulty  result               pass",
      "judge-001-cap       easy        found 5/6            ✗ below 95%",
      "judge-002-free      medium      found 2/2            ✓",
      "judge-003-rounding  hard        found 0/1",
      "judge-004-right     easy        false positives 0/2  ✓",
      "",
    ].join("\n"),
  );
});

test("B17: shows the share of easy and medium cases passing, by difficulty, with a mark only beside a miss", () => {
  const runs = [
    aRun(CAP, "found"),
    aRun(CAP, "not found"),
    aRun(RIGHT, "clean"),
    aRun(RIGHT, "clean"),
    aRun(FREE, "found"),
    aRun(FREE, "found"),
    aRun(ROUNDING, "not found"),
  ];

  const report = renderReport(runs, { runsPerCase: 2 });

  expect(report).toContain("\n\npass rate  67%  ·  easy 1/2  ·  medium 1/1\n\n");
});

test("B17: names only the difficulties that have cases", () => {
  const runs = [aRun(FREE, "found")];

  const report = renderReport(runs, { runsPerCase: 1 });

  expect(report).toContain("\n\npass rate  100%  ·  medium 1/1\n\n");
  expect(report).not.toContain("easy");
  expect(report).not.toContain("hard");
});

test("B18: ends each model's block with its broken runs, only when any broke, then its cost and longest run", () => {
  const runs = [
    aRun(CAP, "found", { costUsd: 0.5, seconds: 12.4 }),
    aRun(CAP, "broken", { costUsd: 2, seconds: 3, failure: "reached the $2 spending limit" }),
    aRun(RIGHT, "broken", { costUsd: 0.5, seconds: 40.6, failure: "claude didn't run" }),
    aRun(CAP, "found", { model: "opus", costUsd: 1, seconds: 61 }),
    aRun(RIGHT, "clean", { model: "opus", costUsd: 0.25, seconds: 5 }),
  ];

  const report = renderReport(runs, { runsPerCase: 2 });

  expect(report).toContain(
    [
      "broken           failure",
      "judge-001-cap    reached the $2 spending limit",
      "judge-004-right  claude didn't run",
      "",
      "$3.00 · longest run 41s",
      "",
      "eval:judge · opus · 2 runs per case",
      "",
      "case             difficulty  result               pass",
      "judge-001-cap    easy        found 1/1            ✓",
      "judge-004-right  easy        false positives 0/1  ✓",
      "",
      "pass rate  100%  ·  easy 2/2",
      "",
      "$1.25 · longest run 61s",
      "",
    ].join("\n"),
  );
  expect(report.split("broken").length).toBe(2);
});
