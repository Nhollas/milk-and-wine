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
import { workingTree } from "../specs/repository.ts";
import { readSubjects, type Scenario, type TestLevel } from "../specs/specs.ts";
import type { Edit } from "./cases.ts";
import { runProcess } from "./subprocess.ts";

export const EXAMPLES_FOLDER = "tools/intent-evals/examples";

const REPO_ROOT = join(import.meta.dirname, "../..");

const LEVELS = ["service", "integration", "system"];

const VITEST_CONFIG = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
${LEVELS.map(
  (level) =>
    `      { extends: true, test: { name: "${level}", include: ["src/**/*.${level}.test.ts", "tests/${level}/**/*.test.ts"] } },`,
).join("\n")}
    ],
  },
});
`;

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

/** The scenarios of an example that a test proves, with the level of that test. */
export function testedScenarios(root: string, example: string): Map<string, TestLevel> {
  return new Map(
    (exampleScenarios(root, example) ?? []).flatMap((scenario) =>
      scenario.verified.kind === "test" ? [[scenario.id, scenario.verified.level]] : [],
    ),
  );
}

export function isStale(edit: Edit, folder: string): boolean {
  const path = join(folder, edit.file);
  return !existsSync(path) || readFileSync(path, "utf8").split(edit.find.join("\n")).length !== 2;
}

/**
 * Gives `work` a copy of one example, laid out as a repository of its own with `edits` applied,
 * and removes the copy after. It shares this repository's installed packages and agents.
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
    cpSync(join(REPO_ROOT, ".claude"), join(directory, ".claude"), { recursive: true });
    cpSync(join(REPO_ROOT, "tsconfig.json"), join(directory, "tsconfig.json"));
    symlinkSync(join(REPO_ROOT, "node_modules"), join(directory, "node_modules"));
    writeFileSync(join(directory, "package.json"), `{ "type": "module" }\n`);
    writeFileSync(join(directory, "vitest.config.ts"), VITEST_CONFIG);
    for (const edit of edits) {
      if (isStale(edit, directory))
        throw new Error(`${edit.file} must contain the find lines once`);
      const path = join(directory, edit.file);
      writeFileSync(
        path,
        readFileSync(path, "utf8").replace(edit.find.join("\n"), () => edit.replace.join("\n")),
      );
    }
    return await work(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Runs an example's tests: all of them, or only those of one scenario at one level. */
export async function runTests(
  directory: string,
  only?: { level: TestLevel; scenario: string },
): Promise<TestResult[]> {
  const reportPath = join(directory, "vitest-report.json");
  await runProcess(
    process.execPath,
    [
      join(directory, "node_modules/vitest/vitest.mjs"),
      "run",
      "--reporter=json",
      `--outputFile=${reportPath}`,
      ...(only ? ["--project", only.level, "-t", `^${only.scenario}: `] : []),
    ],
    { cwd: directory, timeoutMs: 5 * 60 * 1000 },
  );
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
