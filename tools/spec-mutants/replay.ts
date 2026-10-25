import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { TestLevel } from "../spec-status/specs.ts";
import { readSubjectMutants, stopOnInterrupt, withMutantPlanted } from "./mutants.ts";

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      name: z.string(),
      assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
    }),
  ),
});

type RowTests = "passed" | "failed" | "found no test";

function replay(args: string[], root: string): number {
  const runsIndex = args.indexOf("--runs");
  const runs = runsIndex >= 0 ? Number(args[runsIndex + 1]) : 1;
  const [subject, onlyRow] = runsIndex >= 0 ? args.toSpliced(runsIndex, 2) : args;
  if (!subject || !Number.isInteger(runs) || runs < 1) {
    process.stdout.write("usage: pnpm spec:mutants <subject> [<row ID>] [--runs <n>]\n");
    return 1;
  }
  const loaded = readSubjectMutants(subject, root);
  if (typeof loaded === "string") {
    process.stdout.write(`${loaded}\n`);
    return 1;
  }

  const interrupted = stopOnInterrupt();
  let failures = 0;
  for (const row of loaded.rows) {
    if (onlyRow && row.id !== onlyRow) continue;
    const rowMutants = loaded.mutantsByRow.get(row.id);
    if (row.verified.kind !== "test") continue;
    if (!rowMutants) {
      process.stdout.write(`${row.id}  no mutants yet\n`);
      continue;
    }
    if (rowMutants.then !== row.thenText) {
      failures++;
      process.stdout.write(`${row.id}  row changed since its mutants were written; rewrite them\n`);
      continue;
    }
    const level = row.verified.level;
    const unmutated = rowTests(subject, row.id, level, root);
    if (unmutated !== "passed") {
      failures++;
      process.stdout.write(
        `${row.id}  its tests must pass with no mutant planted, but they ${unmutated}\n`,
      );
      continue;
    }

    for (const mutant of rowMutants.mutants) {
      if (interrupted()) return 1;
      const outcome = withMutantPlanted(mutant, root, () => {
        for (let run = 0; run < runs; run++) {
          const result = rowTests(subject, row.id, level, root);
          if (result === "found no test") return "broken";
          if (result === "passed") return "MISSED";
        }
        return "caught";
      });
      if (outcome !== "caught") failures++;
      process.stdout.write(`${row.id}  ${outcome.padEnd(7)}  ${mutant.breaks}\n`);
    }
    for (const { what, why } of rowMutants["not mutated"] ?? []) {
      process.stdout.write(`${row.id}  not mutated  ${what}: ${why}\n`);
    }
  }

  process.stdout.write(
    failures === 0 ? "spec:mutants passed\n" : `spec:mutants failed · ${failures} problems\n`,
  );
  return failures === 0 ? 0 : 1;
}

function rowTests(subject: string, id: string, level: TestLevel, root: string): RowTests {
  const directory = mkdtempSync(join(tmpdir(), "spec-mutants-"));
  const reportPath = join(directory, "report.json");
  try {
    spawnSync(
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        "--project",
        level,
        "--reporter=json",
        `--outputFile=${reportPath}`,
        "-t",
        `^${id}: `,
        `/${subject}.`,
      ],
      { cwd: root, stdio: "ignore" },
    );
    if (!existsSync(reportPath)) return "found no test";
    const report = vitestReport.parse(JSON.parse(readFileSync(reportPath, "utf8")));
    const statuses = report.testResults
      .filter((file) => file.name.endsWith(`.${level}.test.ts`))
      .flatMap((file) => file.assertionResults)
      .filter((test) => test.title.startsWith(`${id}: `))
      .map((test) => test.status);
    const seen = new Set(statuses);
    if (seen.has("failed")) return "failed";
    return seen.has("passed") ? "passed" : "found no test";
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) process.exitCode = replay(process.argv.slice(2), process.cwd());
