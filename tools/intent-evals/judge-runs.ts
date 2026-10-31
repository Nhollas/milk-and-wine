import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalCase } from "./cases.ts";
import { exampleFolder, inWorkspace } from "./examples.ts";
import { JUDGE_FILE, modelOf, promptFor, readReply, type RunJudge } from "./intent-judge.ts";
import { inPool } from "./pool.ts";
import type { Problem, RunOutcome, ScoredRun } from "./runs.ts";

export type JudgeCasesOptions = {
  runs: number;
  /** Models to run the judge on, or undefined for the one its definition names. */
  models: string[] | undefined;
  parallel: number;
};

/** Judges each case `runs` times on each model, and scores every run. */
export async function judgeCases(
  root: string,
  cases: EvalCase[],
  options: JudgeCasesOptions,
  runJudge: RunJudge,
): Promise<ScoredRun[]> {
  const models = options.models ?? [undefined];
  const queue = Array.from({ length: options.runs }, () =>
    models.flatMap((model) => cases.map((evalCase) => ({ evalCase, model }))),
  ).flat();
  return inPool(queue, options.parallel, ({ evalCase, model }) =>
    judgeOnce(root, evalCase, model, runJudge),
  );
}

async function judgeOnce(
  root: string,
  evalCase: EvalCase,
  model: string | undefined,
  runJudge: RunJudge,
): Promise<ScoredRun> {
  const { example } = evalCase;
  try {
    return await inWorkspace(root, example, evalCase.plant, async (directory) => {
      const raw = await runJudge(directory, {
        prompt: promptFor(example, [evalCase.scenario]),
        model,
      });
      const reply = readReply(raw, directory);
      const run = {
        evalCase,
        model: model ?? modelOf(join(directory, JUDGE_FILE)),
        costUsd: reply.costUsd,
        seconds: raw.seconds,
        transcript: raw.transcript,
      };
      if (reply.problems === undefined) {
        return { ...run, outcome: reply.outcome, problems: [], failure: reply.failure };
      }
      const problems = reply.problems.map((problem) => inExample(problem, directory));
      const lines = plantedLines(root, evalCase, directory);
      return {
        ...run,
        outcome: outcomeOf(evalCase, problems, lines),
        problems,
        failure: undefined,
      };
    });
  } catch (error) {
    return {
      evalCase,
      model: model ?? "default",
      outcome: "broken",
      problems: [],
      costUsd: 0,
      seconds: 0,
      failure: `the run failed before the judge replied: ${String(error)}`,
      transcript: "",
    };
  }
}

/** When the tests are right any problem is a false positive; on a planted case one that is its gap finds it. */
function outcomeOf(evalCase: EvalCase, problems: Problem[], lines: Set<string>): RunOutcome {
  if (evalCase.kind === "tests-are-right") {
    return problems.length === 0 ? "clean" : "false positive";
  }
  return problems.some((problem) => isTheGap(problem, evalCase, lines)) ? "found" : "not found";
}

/** The judge may point at a test by its path in the workspace, which is gone once the run ends. */
function inExample(problem: Problem, directory: string): Problem {
  const where =
    problem.where !== null && problem.where.startsWith(`${directory}/`)
      ? problem.where.slice(directory.length + 1)
      : problem.where;
  return { ...problem, where };
}

/** The lines an adds-requirement case's plant changed, in each file it edits, as `path:line`. */
function plantedLines(root: string, evalCase: EvalCase, directory: string): Set<string> {
  if (evalCase.kind !== "adds-requirement") return new Set();
  const files = new Set(evalCase.plant.map((edit) => edit.file));
  return new Set(
    [...files].flatMap((file) => {
      const original = join(exampleFolder(root, evalCase.example), file);
      const before = existsSync(original) ? readFileSync(original, "utf8").split("\n") : [];
      const after = readFileSync(join(directory, file), "utf8").split("\n");
      return changedLines(before, after).map((line) => `${file}:${line}`);
    }),
  );
}

/** The 1-based lines of `after` that differ from `before`, between their common start and end. */
function changedLines(before: string[], after: string[]): number[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = 0;
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  ) {
    end++;
  }
  return Array.from({ length: after.length - end - start }, (_, index) => start + index + 1);
}

/** A problem on the case's scenario that quotes it, or, for an added requirement, points at its test line. */
function isTheGap(problem: Problem, evalCase: EvalCase, lines: Set<string>): boolean {
  if (problem.scenario !== evalCase.scenario) return false;
  if ("quote" in evalCase) return plain(problem.says).includes(plain(evalCase.quote));
  const { file, line } = pointsAt(problem.where);
  return line !== null && lines.has(`${file}:${line}`);
}

/** The test file and line a problem's `where` points at, as `path:line`, or a path, or nothing. */
function pointsAt(where: string | null): { file: string | null; line: number | null } {
  if (where === null) return { file: null, line: null };
  const match = /^(.+?):(\d+)(?:[-–:]\d+)?$/u.exec(where.trim());
  if (match?.[1] === undefined) return { file: where.trim(), line: null };
  return { file: match[1], line: Number(match[2]) };
}

// The judge quotes the scenario's words, so compare them without markdown, quotes and spacing.
function plain(text: string): string {
  return text
    .replaceAll(/[`"'*_]/gu, "")
    .replaceAll(/\s+/gu, " ")
    .trim()
    .toLowerCase();
}
