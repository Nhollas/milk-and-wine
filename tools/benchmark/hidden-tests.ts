import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      assertionResults: z.array(z.object({ fullName: z.string() })),
    }),
  ),
});

// Runs a task's hidden tests with Vitest against a copy of its solution.
export function vitestHiddenTests(root: string) {
  return {
    run(taskFolder: string) {
      const workspace = mkdtempSync(join(tmpdir(), "bench-check-"));
      try {
        cpSync(join(taskFolder, "solution"), workspace, { recursive: true });
        cpSync(join(taskFolder, "tests"), join(workspace, "tests"), { recursive: true });
        const reportPath = join(workspace, "vitest-report.json");
        spawnSync(
          join(root, "node_modules/.bin/vitest"),
          ["run", "--root", workspace, "--reporter=json", `--outputFile=${reportPath}`],
          { cwd: root, stdio: "ignore" },
        );
        const report = vitestReport.parse(JSON.parse(readFileSync(reportPath, "utf8")));
        return report.testResults.flatMap(({ assertionResults }) =>
          assertionResults.map(({ fullName }) => ({ title: fullName })),
        );
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    },
  };
}
