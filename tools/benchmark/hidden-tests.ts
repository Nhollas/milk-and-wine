import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

/** Where a task's hidden tests go in the repository they grade, so they run apart from its own. */
export const HIDDEN_TESTS_FOLDER = "hidden-tests";

/** A Vitest config, relative to the repository's root, that runs the hidden tests and nothing else. */
export const HIDDEN_TESTS_CONFIG = `${HIDDEN_TESTS_FOLDER}/vitest.config.mjs`;

export const HIDDEN_TESTS_CONFIG_SOURCE = `export default { test: { include: ["${HIDDEN_TESTS_FOLDER}/**/*.test.ts"], testTimeout: 60000 } };\n`;

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      assertionResults: z.array(z.object({ fullName: z.string(), status: z.string() })),
    }),
  ),
});

/** Each test's title and whether it passed, from Vitest's JSON report. */
export function hiddenTestResults(report: string): { title: string; passed: boolean }[] {
  return vitestReport.parse(JSON.parse(report)).testResults.flatMap(({ assertionResults }) =>
    assertionResults.map(({ fullName, status }) => ({
      title: fullName,
      passed: status === "passed",
    })),
  );
}

// Runs a task's hidden tests with Vitest against a copy of its starter code, or of its solution:
// the starter code with the solution's files laid over it.
export function vitestHiddenTests(root: string) {
  return {
    run(taskFolder: string, against: "solution" | "starter" = "solution") {
      const workspace = mkdtempSync(join(tmpdir(), "bench-check-"));
      try {
        cpSync(join(taskFolder, "starter"), workspace, { recursive: true });
        if (against === "solution") {
          cpSync(join(taskFolder, "solution"), workspace, { recursive: true });
        }
        cpSync(join(taskFolder, "tests"), join(workspace, HIDDEN_TESTS_FOLDER), {
          recursive: true,
        });
        writeFileSync(join(workspace, HIDDEN_TESTS_CONFIG), HIDDEN_TESTS_CONFIG_SOURCE);
        // The code under test finds its dependencies in this repository's.
        if (!existsSync(join(workspace, "node_modules"))) {
          symlinkSync(join(root, "node_modules"), join(workspace, "node_modules"));
        }
        const reportPath = join(workspace, "vitest-report.json");
        spawnSync(
          join(root, "node_modules/.bin/vitest"),
          [
            "run",
            "--root",
            workspace,
            "--config",
            join(workspace, HIDDEN_TESTS_CONFIG),
            "--reporter=json",
            `--outputFile=${reportPath}`,
          ],
          { cwd: root, stdio: "ignore" },
        );
        return hiddenTestResults(readFileSync(reportPath, "utf8"));
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    },
  };
}
