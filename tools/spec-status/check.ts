import { runFromCommandLine, type CommandResult } from "./command.ts";
import { countByStatus, regressions, trace, traceRevision } from "./trace.ts";

export async function runCheck(args: string[], root: string): Promise<CommandResult> {
  const baseIndex = args.indexOf("--base");
  const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined;

  const current = await trace(root);
  const problems = [
    ...current.problems,
    ...(baseRef ? regressions(await traceRevision(root, baseRef), current) : []),
  ];
  const counts = countByStatus(current.rows);
  const summary = `${counts.delivered} delivered · ${counts.proposed} proposed · ${counts["sign-off"]} sign-off`;

  if (problems.length === 0) return { exitCode: 0, output: `spec:check passed · ${summary}\n` };

  const codeWidth = Math.max(...problems.map((problem) => problem.code.length));
  const lines = problems.map(
    (problem) =>
      `error  ${problem.code.padEnd(codeWidth)}  ${problem.location}  ${problem.message}`,
  );
  return {
    exitCode: 1,
    output: `${lines.join("\n")}\n\nspec:check failed · ${problems.length} errors · ${summary}\n`,
  };
}

if (import.meta.main) await runFromCommandLine(runCheck);
