import { DIFFICULTIES, type EvalCase } from "./cases.ts";
import { isRight, type Problem, type ScoredRun } from "./runs.ts";

type Difficulty = (typeof DIFFICULTIES)[number];

/** The share of a case's runs the judge must get right, by difficulty; a hard case is reported only. */
const MARKS: Record<Difficulty, number | undefined> = { easy: 0.95, medium: 0.75, hard: undefined };

type Share = { count: number; of: number };

/** The report eval:judge prints: forbidden reads first, then a block per model. */
export function renderReport(runs: ScoredRun[], options: { runsPerCase: number }): string {
  const forbidden = runs.filter((run) => run.outcome === "forbidden read");
  const blocks = modelsOf(runs).map((model) =>
    modelBlock(
      runs.filter((run) => run.model === model),
      model,
      options.runsPerCase,
    ),
  );
  return `${[
    ...(forbidden.length === 0
      ? []
      : [
          table([
            ["forbidden read", "model", "failure"],
            ...forbidden.map((run) => [run.evalCase.id, run.model, run.failure ?? ""]),
          ]),
        ]),
    ...blocks,
  ].join("\n\n")}\n`;
}

function modelBlock(own: ScoredRun[], model: string, runsPerCase: number): string {
  const broken = own.filter((run) => run.outcome === "broken");
  return [
    `eval:judge · ${model} · ${runsPerCase} runs per case`,
    casesTable(own),
    ...falsePositives(own),
    passRate(own),
    ...(broken.length === 0
      ? []
      : [
          table([
            ["broken", "failure"],
            ...broken.map((run) => [run.evalCase.id, run.failure ?? ""]),
          ]),
        ]),
    `$${own.reduce((sum, run) => sum + run.costUsd, 0).toFixed(2)} · longest run ${Math.round(Math.max(...own.map((run) => run.seconds)))}s`,
  ].join("\n\n");
}

/** Every case: its difficulty, the runs that found it or were false positives, and ✓ or ✗ against its mark. */
function casesTable(own: ScoredRun[]): string {
  return table([
    ["case", "difficulty", "result", "pass"],
    ...casesOf(own).map((evalCase) => {
      const runs = runsOf(own, evalCase);
      const mark = MARKS[evalCase.difficulty];
      const result =
        evalCase.kind === "tests_are_right"
          ? `false positives ${runs.filter((run) => run.outcome === "false positive").length}/${runs.length}`
          : `found ${right(runs).count}/${runs.length}`;
      return [
        evalCase.id,
        evalCase.difficulty,
        result,
        mark === undefined ? "" : passes(right(runs), mark) ? "✓" : `✗ below ${percent(mark)}%`,
      ];
    }),
  ]);
}

/** Under each tests_are_right case with false positives, each problem once, with how many runs reported it. */
function falsePositives(own: ScoredRun[]): string[] {
  return casesOf(own).flatMap((evalCase) => {
    const reported = reportedProblems(runsOf(own, evalCase));
    if (evalCase.kind !== "tests_are_right" || reported.length === 0) return [];
    return [
      [
        `false positives on ${evalCase.id}`,
        ...reported.map(
          ([problem, times]) =>
            `  ${problem.scenario} ${problem.verdict} "${problem.says}"${at(problem)}${times === 1 ? "" : `  ×${times}`}`,
        ),
      ].join("\n"),
    ];
  });
}

/** `pass rate  83%  ·  easy 5/5  ·  medium 0/1`, over the difficulties with a mark and cases. */
function passRate(own: ScoredRun[]): string {
  const shares = DIFFICULTIES.flatMap((difficulty): [Difficulty, Share][] => {
    const mark = MARKS[difficulty];
    const cases = casesOf(own).filter((evalCase) => evalCase.difficulty === difficulty);
    if (mark === undefined || cases.length === 0) return [];
    const passing = cases.filter((evalCase) => passes(right(runsOf(own, evalCase)), mark));
    return [[difficulty, { count: passing.length, of: cases.length }]];
  });
  const all = shares.reduce(
    (sum, [, share]) => ({ count: sum.count + share.count, of: sum.of + share.of }),
    { count: 0, of: 0 },
  );
  if (all.of === 0) return "pass rate  no easy or medium cases";
  return [
    `pass rate  ${percent(all.count / all.of)}%`,
    ...shares.map(([difficulty, share]) => `${difficulty} ${share.count}/${share.of}`),
  ].join("  ·  ");
}

/** Each distinct problem the runs reported, with how many runs reported it, in the order first seen. */
function reportedProblems(runs: ScoredRun[]): [Problem, number][] {
  const seen = new Map<string, [Problem, number]>();
  for (const problem of runs.flatMap((run) => run.problems)) {
    const key = JSON.stringify([
      problem.scenario,
      problem.verdict,
      problem.says,
      problem.file,
      problem.line,
    ]);
    const entry = seen.get(key);
    if (entry === undefined) seen.set(key, [problem, 1]);
    else entry[1]++;
  }
  return [...seen.values()];
}

function at({ file, line }: Problem): string {
  if (file === null) return "";
  return line === null ? ` at ${file}` : ` at ${file}:${line}`;
}

function modelsOf(runs: ScoredRun[]): string[] {
  return [...new Set(runs.map((run) => run.model))];
}

/** The cases the runs cover, each once, by ID. */
function casesOf(runs: ScoredRun[]): EvalCase[] {
  const byId = new Map(runs.map((run) => [run.evalCase.id, run.evalCase]));
  return [...byId.keys()].toSorted().map((id) => byId.get(id)!);
}

function runsOf(runs: ScoredRun[], evalCase: EvalCase): ScoredRun[] {
  return runs.filter((run) => run.evalCase.id === evalCase.id);
}

/** Runs the judge got right, out of all runs. Broken and forbidden-read runs count as wrong. */
function right(runs: ScoredRun[]): Share {
  return { count: runs.filter((run) => isRight(run)).length, of: runs.length };
}

function passes(share: Share, mark: number): boolean {
  return share.of > 0 && share.count / share.of >= mark;
}

function percent(rate: number): number {
  return Math.round(rate * 100);
}

/** Rows as aligned columns, two spaces apart. */
function table(rows: string[][]): string {
  const widths = rows[0]!.map((_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, column) => cell.padEnd(widths[column]!))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}
