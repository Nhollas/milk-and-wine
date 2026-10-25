import { parseArgs } from "node:util";
import { type EvalCase, matching, readCases, testedRows } from "./cases.ts";
import { inPool } from "./pool.ts";
import { inWorkspace, runRowTests } from "./workspace.ts";

// A case is real if the row's own tests pass, catch the bug, and miss it once weakened.
// The judge isn't involved, so the answer doesn't depend on it.
async function problemWith(evalCase: EvalCase, root: string): Promise<string | undefined> {
  const { subject, row, weaken, bug } = evalCase;
  const level = testedRows(root, subject).get(row);
  if (level === undefined) return `${subject} ${row} isn't verified by a test`;
  const rowTests = (edits: Parameters<typeof inWorkspace>[1]) =>
    inWorkspace(root, edits, (directory) => runRowTests(directory, subject, level, row));

  const asTheyAre = await rowTests([]);
  if (asTheyAre !== "passed") return `${row}'s tests must pass as they are, but ${asTheyAre}`;
  const withBug = await rowTests([bug]);
  if (withBug !== "failed") {
    return `${row}'s tests must catch the bug before they are weakened, but ${withBug}`;
  }
  const weakenedWithBug = await rowTests([...weaken, bug]);
  if (weakenedWithBug !== "passed") {
    return `${row}'s weakened tests must miss the bug, but ${weakenedWithBug}`;
  }
  return undefined;
}

async function validate(args: string[], root: string): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      subject: { type: "string" },
      case: { type: "string" },
      parallel: { type: "string", default: "4" },
    },
  });
  const cases = matching(readCases(root), { subject: values.subject, id: values.case });
  if (cases.length === 0) {
    process.stdout.write("no cases match\n");
    return 1;
  }

  const problems = await inPool(cases, Number(values.parallel), async (evalCase) => {
    const problem = await problemWith(evalCase, root).catch(String);
    process.stdout.write(`${problem ? "FAIL" : "ok  "}  ${evalCase.subject}/${evalCase.id}\n`);
    return problem && `${evalCase.subject}/${evalCase.id}: ${problem}`;
  });

  const failed = problems.filter((problem) => problem !== undefined);
  for (const problem of failed) process.stdout.write(`\n${problem}\n`);
  process.stdout.write(
    failed.length === 0
      ? `\n${cases.length} cases are real\n`
      : `\n${failed.length} of ${cases.length} cases are not real\n`,
  );
  return failed.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exitCode = await validate(process.argv.slice(2), process.cwd());
