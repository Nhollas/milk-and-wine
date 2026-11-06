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
  run(taskFolder: string): HiddenTestResult[];
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

  const scenarios = [...scenarioLines(readFileSync(join(taskFolder, "spec.md"), "utf8"))];
  const solutionResults = hiddenTests.run(taskFolder);
  return {
    exitCode: 0,
    output: `ok: ${scenarios.length} scenarios, ${solutionResults.length} hidden tests\nbench:check passed\n`,
  };
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
