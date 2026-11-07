import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { scenarioLines } from "../specs/specs.ts";
import { vitestHiddenTests } from "./hidden-tests.ts";

const TASKS_FOLDER = "tools/benchmark/tasks";

const TASK_PARTS = [
  { part: "spec", path: "spec.md" },
  { part: "issue", path: "issue.md" },
  { part: "ticket", path: "tickets" },
  { part: "starter code", path: "starter" },
  { part: "hidden tests", path: "tests" },
  { part: "solution", path: "solution" },
] as const;

type HiddenTestResult = { title: string; passed: boolean };

type HiddenTests = {
  run(taskFolder: string, against?: "solution" | "starter"): HiddenTestResult[];
};

type CheckOptions = { root: string; hiddenTests: HiddenTests };

type CheckResult = { exitCode: number; output: string };

export function check(args: string[], { root, hiddenTests }: CheckOptions): CheckResult {
  const [task] = args;
  if (!task) {
    return { exitCode: 1, output: "usage: pnpm bench:check <task>\n" };
  }
  const taskFolder = join(root, TASKS_FOLDER, task);
  if (!isDirectory(taskFolder)) return { exitCode: 1, output: `unknown task: ${task}\n` };

  const missing = TASK_PARTS.filter(({ path }) => !hasContent(join(taskFolder, path)));
  if (missing.length > 0) {
    const lines = missing.map(({ part }) => `  missing ${part}\n`).join("");
    return { exitCode: 1, output: `${task} is not valid:\n${lines}` };
  }

  const scenarioIds = [...scenarioLines(readFileSync(join(taskFolder, "spec.md"), "utf8"))].map(
    ({ cells: [id = ""] }) => id,
  );
  const solutionResults = hiddenTests.run(taskFolder, "solution");
  const starterResults = hiddenTests.run(taskFolder, "starter");
  const testedIds = new Set(solutionResults.map(({ title }) => idOf(title)));
  const problems = [
    ...solutionResults
      .filter(({ passed }) => !passed)
      .map(({ title }) => `fails on the solution  ${title}`),
    ...starterResults
      .filter(({ passed }) => passed)
      .map(({ title }) => `passes on the starter code  ${title}`),
    ...scenarioIds.filter((id) => !testedIds.has(id)).map((id) => `no hidden test  ${id}`),
    ...solutionResults
      .filter(({ title }) => !scenarioIds.includes(idOf(title)))
      .map(({ title }) => `unknown-id  ${title}`),
  ];
  if (problems.length > 0) {
    return {
      exitCode: 1,
      output: `${task} is not valid:\n${problems.map((problem) => `  ${problem}\n`).join("")}`,
    };
  }
  return {
    exitCode: 0,
    output: `ok: ${scenarioIds.length} scenarios, ${solutionResults.length} hidden tests\nbench:check passed\n`,
  };
}

// A hidden test's title starts with its scenario's ID, as in "B2: costs 4 for two".
function idOf(title: string): string {
  return title.split(":")[0] ?? "";
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function hasContent(path: string): boolean {
  if (!existsSync(path)) return false;
  return !statSync(path).isDirectory() || readdirSync(path).length > 0;
}

if (import.meta.main) {
  const root = process.cwd();
  const { exitCode, output } = check(process.argv.slice(2), {
    root,
    hiddenTests: vitestHiddenTests(root),
  });
  process.stdout.write(output);
  process.exitCode = exitCode;
}
