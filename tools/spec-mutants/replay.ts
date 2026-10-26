import { spawnSync } from "node:child_process";
import { existsSync, mkdtempDisposableSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { TestLevel } from "../specs/specs.ts";
import { isStale, readSubjectMutants, type Mutant } from "./mutants.ts";

const REPLAY_CONFIG = join(import.meta.dirname, "replay-config.ts");

const vitestReport = z.object({
  testResults: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      assertionResults: z.array(z.object({ title: z.string(), status: z.string() })),
    }),
  ),
});

type RowTests = "passed" | "failed" | "missing";

type ReplayResult = { exitCode: number; output: string };

export function replay(args: string[], root: string): ReplayResult {
  const [subject] = args;
  if (!subject || args.length !== 1) {
    return { exitCode: 1, output: "usage: pnpm spec:mutants <subject>\n" };
  }
  const loaded = readSubjectMutants(subject, root);
  if (typeof loaded === "string") return { exitCode: 1, output: `${loaded}\n` };

  let output = "";
  let problems = 0;
  for (const row of loaded.rows) {
    const rowMutants = loaded.mutantsByRow.get(row.id);
    if (row.verified.kind !== "test" || !rowMutants) continue;
    if (rowMutants.then !== row.thenText) {
      problems++;
      output += `${row.id}  then-changed\n    was  ${rowMutants.then}\n    now  ${row.thenText}\n`;
      continue;
    }
    const level = row.verified.level;
    const unmutated = rowTests(subject, row.id, level, root);
    if (unmutated !== "passed") {
      problems++;
      const instead = unmutated === "failed" ? "they failed" : "there are none";
      output += `${row.id}  its tests must pass with no mutant planted, but ${instead}\n`;
      continue;
    }

    output += `${row.id}  ${row.thenText}\n`;
    for (const mutant of rowMutants.mutants) {
      if (isStale(mutant, root)) {
        problems++;
        output += `    stale     ${mutant.breaks}: find must appear exactly once in ${mutant.file}\n`;
        continue;
      }
      const survived = rowTests(subject, row.id, level, root, mutant) === "passed";
      if (survived) problems++;
      output += `    ${survived ? "survived" : "killed  "}  ${mutant.breaks}\n`;
    }
  }

  output +=
    problems === 0 ? "spec:mutants passed\n" : `spec:mutants failed · ${problems} problems\n`;
  return { exitCode: problems === 0 ? 0 : 1, output };
}

function rowTests(
  subject: string,
  id: string,
  level: TestLevel,
  root: string,
  planted?: Mutant,
): RowTests {
  using directory = mkdtempDisposableSync(join(tmpdir(), "spec-mutants-"));
  const reportPath = join(directory.path, "report.json");
  spawnSync(
    join(root, "node_modules/.bin/vitest"),
    [
      "run",
      "--config",
      REPLAY_CONFIG,
      "--project",
      level,
      "--reporter=json",
      `--outputFile=${reportPath}`,
      "-t",
      `^${id}: `,
      `/${subject}.`,
    ],
    {
      cwd: root,
      stdio: "ignore",
      env: {
        ...process.env,
        SPEC_MUTANTS_ROOT: root,
        SPEC_MUTANT: planted ? JSON.stringify(planted) : "",
      },
    },
  );
  if (!existsSync(reportPath)) return "missing";
  const files = vitestReport
    .parse(JSON.parse(readFileSync(reportPath, "utf8")))
    .testResults.filter((file) => file.name.endsWith(`.${level}.test.ts`));
  const statuses = new Set(
    files.flatMap((file) =>
      file.assertionResults
        .filter((test) => test.title.startsWith(`${id}: `))
        .map((test) => test.status),
    ),
  );
  // A mutant can stop a test file loading at all, which fails its tests as surely as an assertion.
  if (statuses.has("failed") || files.some((file) => file.status === "failed")) return "failed";
  return statuses.has("passed") ? "passed" : "missing";
}

if (import.meta.main) {
  const { exitCode, output } = replay(process.argv.slice(2), process.cwd());
  process.stdout.write(output);
  process.exitCode = exitCode;
}
