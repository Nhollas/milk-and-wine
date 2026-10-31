import { parseArgs } from "node:util";
import { type CaseFile, DIFFICULTIES, type EvalCase, KINDS, readCaseFiles } from "./cases.ts";
import {
  EXAMPLES_FOLDER,
  exampleFolder,
  exampleScenarios,
  inWorkspace,
  isStale,
  outcomeOf,
  runTests,
  testedScenarios,
} from "./examples.ts";
import { inPool } from "./pool.ts";

type CheckResult = { exitCode: number; output: string };

/** A line of the report: one case's verdict, or a message about a file or an example. */
type Line = { id?: string; label?: string; text: string; problem: boolean };

const LABEL_WIDTH = "not a gap".length;

/** Checks every case is a real gap in its example's tests, or right, without running the judge. */
export async function check(args: string[], root: string): Promise<CheckResult> {
  const { values } = parseArgs({ args, options: { parallel: { type: "string", default: "4" } } });
  const files = readCaseFiles(root);
  const lines: Line[] = files.flatMap((file) =>
    file.evalCase === undefined ? [problem(`${file.path} is not valid:\n${file.invalid}`)] : [],
  );
  const cases = files.flatMap((file) => (file.evalCase === undefined ? [] : [file.evalCase]));
  lines.push(...duplicates(cases));

  for (const example of new Set(cases.map((evalCase) => evalCase.example))) {
    const own = cases.filter((evalCase) => evalCase.example === example);
    lines.push(...(await checkExample(example, own, root, Number(values.parallel))));
  }

  const tooFew = KINDS.flatMap((kind) =>
    DIFFICULTIES.flatMap((difficulty) => {
      const count = cases.filter(
        (evalCase) => evalCase.kind === kind && evalCase.difficulty === difficulty,
      ).length;
      return count < 2 ? [`${kind} ${difficulty} (${count})`] : [];
    }),
  );
  if (tooFew.length > 0)
    lines.push({ text: `too few cases: ${tooFew.join(", ")}`, problem: false });

  const problems = lines.filter((line) => line.problem).length;
  const verdict = problems === 0 ? "eval:check passed" : `eval:check failed · ${problems} problems`;
  return {
    exitCode: problems === 0 ? 0 : 1,
    output: `${[...render(lines), verdict].join("\n")}\n`,
  };
}

async function checkExample(
  example: string,
  cases: EvalCase[],
  root: string,
  parallel: number,
): Promise<Line[]> {
  const scenarios = exampleScenarios(root, example);
  if (scenarios === undefined) {
    return cases.map((evalCase) =>
      caseLine(evalCase, "unknown", `no example at ${EXAMPLES_FOLDER}/${example}`, true),
    );
  }

  const asTheyAre = await inWorkspace(root, example, [], runTests);
  const failing = asTheyAre.filter((test) => test.status === "failed").map((test) => test.title);
  const untested = [...testedScenarios(root, example).keys()].filter(
    (id) => outcomeOf(asTheyAre, id) === "found no test",
  );
  if (failing.length > 0 || untested.length > 0) {
    const reasons = [
      ...failing.map((title) => `"${title}" fails`),
      ...untested.map((id) => `${id} has no test`),
    ];
    return [problem(`${example}: tests must pass as they are, but ${reasons.join(", ")}`)];
  }

  return inPool(cases, parallel, (evalCase) => checkCase(evalCase, root));
}

async function checkCase(evalCase: EvalCase, root: string): Promise<Line> {
  const { example, scenario, plant, kind, difficulty } = evalCase;
  const level = testedScenarios(root, example).get(scenario);
  if (level === undefined) {
    return caseLine(
      evalCase,
      "unknown",
      `${example} has no scenario ${scenario} verified by a test`,
      true,
    );
  }
  const edits = [...plant, ...("bug" in evalCase ? [evalCase.bug] : [])];
  const stale = edits.find((edit) => isStale(edit, exampleFolder(root, example)));
  if (stale) {
    return caseLine(evalCase, "stale", `find must appear exactly once in ${stale.file}`, true);
  }

  const scenarioTests = (planted: typeof edits) =>
    inWorkspace(root, example, planted, async (directory) =>
      outcomeOf(await runTests(directory, { level, scenario }), scenario),
    );
  if ("bug" in evalCase) {
    if ((await scenarioTests([evalCase.bug])) === "passed") {
      return caseLine(evalCase, "not a gap", "the tests pass with the bug alone", true);
    }
    if ((await scenarioTests(edits)) !== "passed") {
      return caseLine(evalCase, "not a gap", "the tests still fail once the gap is planted", true);
    }
  } else if (kind === "contradicts-requirement" && (await scenarioTests(plant)) === "passed") {
    return caseLine(evalCase, "not a gap", "the tests pass with the contradiction planted", true);
  } else if (
    kind === "tests-are-right" &&
    plant.length > 0 &&
    (await scenarioTests(plant)) !== "passed"
  ) {
    return caseLine(evalCase, "fails", "the tests fail with the plant", true);
  }
  return caseLine(evalCase, "ok", `${kind}, ${difficulty}: ${evalCase.title}`, false);
}

/** Two cases with one number would be told apart by their slugs alone, which may change. */
function duplicates(cases: EvalCase[]): Line[] {
  const numbers = new Set(cases.map((evalCase) => evalCase.number));
  return [...numbers].flatMap((number) => {
    const sharing = cases.filter((evalCase) => evalCase.number === number);
    return sharing.length < 2
      ? []
      : sharing.map((evalCase) =>
          caseLine(evalCase, "duplicate", `number ${number} is used twice`, true),
        );
  });
}

function caseLine(evalCase: EvalCase, label: string, text: string, isProblem: boolean): Line {
  return { id: evalCase.id, label, text, problem: isProblem };
}

function render(lines: Line[]): string[] {
  const idWidth = Math.max(0, ...lines.map((line) => line.id?.length ?? 0));
  return lines.map((line) =>
    line.id === undefined || line.label === undefined
      ? line.text
      : `${line.id.padEnd(idWidth)}  ${line.label.padEnd(LABEL_WIDTH)}  ${line.text}`,
  );
}

function problem(text: string): Line {
  return { text, problem: true };
}

export function validCases(files: CaseFile[]): EvalCase[] {
  const invalid = files.find((file) => file.evalCase === undefined);
  if (invalid) throw new Error(`${invalid.path} is not valid: run eval:check`);
  return files.flatMap((file) => (file.evalCase === undefined ? [] : [file.evalCase]));
}

if (import.meta.main) {
  const { exitCode, output } = await check(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
