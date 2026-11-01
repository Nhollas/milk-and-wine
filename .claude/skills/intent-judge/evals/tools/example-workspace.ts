import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { workingTree } from "../../../../../tools/specs/repository.ts";
import { readSubjects, type Scenario } from "../../../../../tools/specs/specs.ts";
import type { Edit } from "./case-files.ts";

export const EXAMPLES_FOLDER = ".claude/skills/intent-judge/evals/examples";

const REPO_ROOT = join(import.meta.dirname, "../../../../..");

const TESTS_TIMEOUT_MS = 5 * 60 * 1000;

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
    }),
  ),
});

export type TestResult = z.infer<
  typeof vitestReport
>["testResults"][number]["assertionResults"][number];

export type ScenarioOutcome = "passed" | "failed" | "found no test";

export function exampleFolder(root: string, example: string): string {
  return join(root, EXAMPLES_FOLDER, example);
}

/** The scenarios of an example's spec, or nothing when there is no such example. */
export function exampleScenarios(root: string, example: string): Scenario[] | undefined {
  const folder = exampleFolder(root, example);
  if (!existsSync(folder)) return undefined;
  return readSubjects(workingTree(folder)).subjects.find(({ name }) => name === example)?.scenarios;
}

/** The IDs of an example's scenarios that a test proves. */
export function testedScenarios(root: string, example: string): string[] {
  return (exampleScenarios(root, example) ?? [])
    .filter((scenario) => scenario.verified.kind === "test")
    .map((scenario) => scenario.id);
}

export function isStale(edit: Edit, folder: string): boolean {
  const path = join(folder, edit.file);
  return !existsSync(path) || readFileSync(path, "utf8").split(edit.find.join("\n")).length !== 2;
}

/**
 * Gives `work` a copy of one example, laid out as a repository of its own with `edits` applied,
 * and removes the copy after. It shares this repository's installed packages.
 */
export async function inWorkspace<Result>(
  root: string,
  example: string,
  edits: Edit[],
  work: (directory: string) => Promise<Result>,
): Promise<Result> {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "intent-evals-"));
  try {
    cpSync(exampleFolder(root, example), directory, { recursive: true });
    symlinkSync(join(REPO_ROOT, "node_modules"), join(directory, "node_modules"));
    writeFileSync(join(directory, "package.json"), `{ "type": "module" }\n`);
    plant(directory, edits);
    return await work(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Applies each edit to the copy of an example in `directory`. */
export function plant(directory: string, edits: Edit[]): void {
  for (const edit of edits) {
    if (isStale(edit, directory)) throw new Error(`${edit.file} must contain the find lines once`);
    const path = join(directory, edit.file);
    writeFileSync(
      path,
      readFileSync(path, "utf8").replace(edit.find.join("\n"), () => edit.replace.join("\n")),
    );
  }
}

/** Runs every test of the example in `directory`. */
export async function runTests(directory: string): Promise<TestResult[]> {
  const reportPath = join(directory, "vitest-report.json");
  const vitest = spawn(
    process.execPath,
    [
      join(directory, "node_modules/vitest/vitest.mjs"),
      "run",
      "--reporter=json",
      `--outputFile=${reportPath}`,
    ],
    { cwd: directory, timeout: TESTS_TIMEOUT_MS, stdio: "ignore" },
  );
  await once(vitest, "close");
  if (!existsSync(reportPath)) return [];
  const report = vitestReport.parse(JSON.parse(readFileSync(reportPath, "utf8")));
  return report.testResults.flatMap((file) => file.assertionResults);
}

export function outcomeOf(results: TestResult[], scenario: string): ScenarioOutcome {
  const statuses = new Set(
    results.filter((test) => test.title.startsWith(`${scenario}: `)).map((test) => test.status),
  );
  if (statuses.has("failed")) return "failed";
  return statuses.has("passed") ? "passed" : "found no test";
}
