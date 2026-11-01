import { parseArgs } from "node:util";
import { matching, readCaseFiles } from "./cases.ts";
import { validCases } from "./check.ts";
import { runClaudeJudge } from "./intent-judge.ts";
import { judgeCases } from "./judge-runs.ts";
import { renderReport } from "./report.ts";
import { saveReport } from "./save-report.ts";

async function runJudge(args: string[], root: string): Promise<number> {
  const { values } = parseArgs({
    args,
    options: {
      case: { type: "string" },
      runs: { type: "string", default: "6" },
      models: { type: "string" },
      parallel: { type: "string", default: "4" },
    },
  });
  const cases = matching(validCases(readCaseFiles(root)), values.case);
  if (cases.length === 0) {
    process.stdout.write("no cases match\n");
    return 1;
  }
  const options = {
    runs: Number(values.runs),
    models: values.models?.split(","),
    parallel: Number(values.parallel),
  };
  process.stdout.write(
    `judging ${cases.length} cases ${options.runs} times on ${options.models?.join(", ") ?? "the definition's model"}\n`,
  );

  const runs = await judgeCases(root, cases, options, runClaudeJudge);

  const report = renderReport(runs, { runsPerCase: options.runs });
  const saved = saveReport(root, runs, report);
  process.stdout.write(`\n${report}\nsaved in ${saved}\n`);
  return 0;
}

if (import.meta.main) process.exitCode = await runJudge(process.argv.slice(2), process.cwd());
