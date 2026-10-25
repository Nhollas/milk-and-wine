import {
  cpSync,
  existsSync,
  mkdtempSync,
  realpathSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { z } from "zod";
import type { TestLevel } from "../spec-status/specs.ts";
import type { Edit } from "./cases.ts";
import { runProcess } from "./subprocess.ts";

const NOT_COPIED = new Set(["node_modules", ".git", "reports", ".stryker-tmp"]);

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
    }),
  ),
});

export type RowOutcome = "passed" | "failed" | "found no test";

/**
 * Gives `work` its own copy of the repository with `edits` applied, and removes the copy after.
 * The copy shares the original's installed packages.
 */
export async function inWorkspace<Result>(
  root: string,
  edits: Edit[],
  work: (directory: string) => Promise<Result>,
): Promise<Result> {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), "intent-evals-"));
  try {
    cpSync(root, directory, {
      recursive: true,
      filter: (source) => !NOT_COPIED.has(basename(source)),
    });
    symlinkSync(join(root, "node_modules"), join(directory, "node_modules"));
    applyEdits(directory, edits);
    return await work(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function applyEdits(directory: string, edits: Edit[]): void {
  for (const { file, find, replace } of edits) {
    const path = join(directory, file);
    if (!existsSync(path)) throw new Error(`${file} does not exist`);
    const original = readFileSync(path, "utf8");
    const needle = find.join("\n");
    if (original.split(needle).length !== 2) {
      throw new Error(`${file} must contain "${find[0]}" exactly once, to edit it`);
    }
    writeFileSync(
      path,
      original.replace(needle, () => replace.join("\n")),
    );
  }
}

/** Runs only the tests that prove one row, as the row's own tests are all that count for it. */
export async function runRowTests(
  directory: string,
  subject: string,
  level: TestLevel,
  row: string,
): Promise<RowOutcome> {
  const reportPath = join(directory, "vitest-report.json");
  await runProcess(
    process.execPath,
    [
      join(directory, "node_modules/vitest/vitest.mjs"),
      "run",
      "--project",
      level,
      "--reporter=json",
      `--outputFile=${reportPath}`,
      "-t",
      `^${row}: `,
      `${subject}.${level}.test.ts`,
    ],
    { cwd: directory, timeoutMs: 5 * 60 * 1000 },
  );
  if (!existsSync(reportPath)) return "found no test";

  const report = vitestReport.parse(JSON.parse(readFileSync(reportPath, "utf8")));
  const statuses = new Set(
    report.testResults
      .flatMap((file) => file.assertionResults)
      .filter((test) => test.title.startsWith(`${row}: `))
      .map((test) => test.status),
  );
  if (statuses.has("failed")) return "failed";
  return statuses.has("passed") ? "passed" : "found no test";
}
