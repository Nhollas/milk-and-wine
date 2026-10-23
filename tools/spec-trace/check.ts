import { runFromCommandLine, type CommandResult } from "./command.ts";
import { gitRevision, workingTree } from "./repository.ts";
import { countByStatus, regressions, trace } from "./trace.ts";

export function runCheck(args: string[], root: string): CommandResult {
  const baseIndex = args.indexOf("--base");
  const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined;

  const current = trace(workingTree(root));
  const problems = [...current.problems, ...(baseRef ? regressions(trace(gitRevision(root, baseRef)), current) : [])];
  const counts = countByStatus(current.rows);
  const summary = `${counts.delivered} delivered · ${counts.proposed} proposed · ${counts["sign-off"]} sign-off`;

  if (problems.length === 0) return { exitCode: 0, output: `spec:check passed · ${summary}\n` };

  const width = Math.max(...problems.map((problem) => problem.code.length));
  const lines = problems.map((problem) => `error  ${problem.code.padEnd(width)}  ${problem.where}  ${problem.message}`);
  return { exitCode: 1, output: `${lines.join("\n")}\n\nspec:check failed · ${problems.length} errors · ${summary}\n` };
}

if (import.meta.main) runFromCommandLine(runCheck);
