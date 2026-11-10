import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { z } from "zod";
import { workingTree } from "../../tools/specs/repository.ts";
import { readSubjects, type Scenario } from "../../tools/specs/specs.ts";

export const EVALS_FOLDER = "evals/intent-judge";

export const FIXTURES_FOLDER = `${EVALS_FOLDER}/fixtures`;

const REPO_ROOT = join(import.meta.dirname, "../..");

const TESTS_TIMEOUT_MS = 5 * 60 * 1000;

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
    }),
  ),
});

type TestResult = z.infer<typeof vitestReport>["testResults"][number]["assertionResults"][number];

export type ScenarioOutcome = "passed" | "failed" | "found no test";

export function fixtureFolder(root: string, fixture: string): string {
  return join(root, FIXTURES_FOLDER, fixture);
}

/** The scenarios of a fixture's spec, or nothing when there is no such fixture. */
function fixtureScenarios(root: string, fixture: string): Scenario[] | undefined {
  const folder = fixtureFolder(root, fixture);
  if (!existsSync(folder)) return undefined;
  return readSubjects(workingTree(folder)).subjects.find(({ name }) => name === fixture)?.scenarios;
}

/** The IDs of a fixture's scenarios that a test proves, or nothing when there is no such fixture. */
export function testedScenarios(root: string, fixture: string): string[] | undefined {
  return fixtureScenarios(root, fixture)
    ?.filter((scenario) => scenario.verified.kind === "test")
    .map((scenario) => scenario.id);
}

/** Every file under `folder`, as paths relative to it. */
export function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(folder, join(entry.parentPath, entry.name)))
    .toSorted();
}

/**
 * Gives `work` a copy of a fixture, laid out as a repository of its own with each of `overlays`
 * copied over it in turn, and removes the copy after. It shares this repository's packages.
 */
export async function inWorkspace<Result>(
  root: string,
  fixture: string,
  overlays: string[],
  work: (directory: string) => Promise<Result>,
): Promise<Result> {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "intent-evals-"));
  try {
    cpSync(fixtureFolder(root, fixture), directory, { recursive: true });
    for (const overlay of overlays) {
      for (const file of filesUnder(overlay)) cpSync(join(overlay, file), join(directory, file));
    }
    symlinkSync(join(REPO_ROOT, "node_modules"), join(directory, "node_modules"));
    writeFileSync(join(directory, "package.json"), `{ "type": "module" }\n`);
    return await work(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** Runs every test in `directory`. */
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
