import { spawnSync } from "node:child_process";
import { existsSync, globSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const bugsFile = z.object({
  row: z.string(),
  bugs: z.array(
    z.union([
      z.object({ promise: z.string(), file: z.string(), find: z.string(), replace: z.string() }),
      z.object({ promise: z.string(), reason: z.string() }),
    ]),
  ),
});

const vitestReport = z.object({
  numTotalTests: z.number(),
  numFailedTests: z.number(),
  numPendingTests: z.number(),
});

type Outcome = "caught" | "MISSED" | "broken" | "stale" | "skipped";

function replay(args: string[], root: string): number {
  const [subject, row] = args;
  const runsIndex = args.indexOf("--runs");
  const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 1;
  if (!subject || !row || !/^B\d+$/u.test(row) || !Number.isInteger(runs) || runs < 1) {
    process.stdout.write("usage: pnpm row-bugs <subject> <row ID> [--runs <n>]\n");
    return 1;
  }

  const [bugsPath] = globSync(`specs/**/${subject}/bugs/${row}.json`, { cwd: root });
  if (!bugsPath) {
    process.stdout.write(
      `no bugs saved for ${subject} ${row}: expected specs/**/${subject}/bugs/${row}.json\n`,
    );
    return 1;
  }
  const { bugs } = bugsFile.parse(JSON.parse(readFileSync(join(root, bugsPath), "utf8")));

  const unbugged = runRowTests(subject, row, root);
  if (unbugged !== "passed") {
    process.stdout.write(
      `${subject} ${row}'s tests must pass before any bug is planted, but they ${unbugged}\n`,
    );
    return 1;
  }

  process.stdout.write(
    `${subject} ${row} · ${bugs.length} bugs · ${runs} ${runs === 1 ? "run" : "runs"} each\n`,
  );
  const outcomes: Outcome[] = [];
  for (const bug of bugs) {
    const outcome = "reason" in bug ? "skipped" : plant(bug, subject, row, runs, root);
    outcomes.push(outcome);
    const note = "reason" in bug ? ` (${bug.reason})` : "";
    process.stdout.write(`${outcome.padEnd(7)}  ${bug.promise}${note}\n`);
  }

  const failures = outcomes.filter(
    (outcome) => outcome !== "caught" && outcome !== "skipped",
  ).length;
  process.stdout.write(
    failures === 0 ? "row-bugs passed\n" : `row-bugs failed · ${failures} not caught\n`,
  );
  return failures === 0 ? 0 : 1;
}

function plant(
  bug: { file: string; find: string; replace: string },
  subject: string,
  row: string,
  runs: number,
  root: string,
): Outcome {
  const path = join(root, bug.file);
  const original = readFileSync(path, "utf8");
  if (original.split(bug.find).length !== 2) return "stale";

  writeFileSync(
    path,
    original.replace(bug.find, () => bug.replace),
  );
  try {
    for (let run = 0; run < runs; run++) {
      const result = runRowTests(subject, row, root);
      if (result === "found no test") return "broken";
      if (result === "passed") return "MISSED";
    }
    return "caught";
  } finally {
    writeFileSync(path, original);
  }
}

function runRowTests(
  subject: string,
  row: string,
  root: string,
): "passed" | "failed" | "found no test" {
  const directory = mkdtempSync(join(tmpdir(), "row-bugs-"));
  const reportPath = join(directory, "report.json");
  try {
    spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--project",
        "!smoke",
        "--reporter=json",
        `--outputFile=${reportPath}`,
        "-t",
        `^${row}: `,
        `/${subject}.`,
      ],
      { cwd: root, stdio: "ignore" },
    );
    const report = existsSync(reportPath)
      ? vitestReport.parse(JSON.parse(readFileSync(reportPath, "utf8")))
      : undefined;
    if (!report || report.numTotalTests - report.numPendingTests === 0) return "found no test";
    return report.numFailedTests > 0 ? "failed" : "passed";
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = replay(process.argv.slice(2), process.cwd());
