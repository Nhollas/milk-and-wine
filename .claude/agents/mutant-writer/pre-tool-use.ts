import { readFileSync } from "node:fs";
import { readFileRoles, repoPathOf, roleOf } from "../../../tools/file-roles/file-roles.ts";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?: string;
};

export function blockReasonOf(
  input: string,
  root: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const roles = readFileRoles(env);
  if (typeof roles === "string") return `The mutant writer can't tell what any file is: ${roles}.`;

  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);
  const outside = toolPath !== undefined && path === undefined;

  if (event.tool_name === "Glob") {
    return outside ? "The mutant writer reads only this repository." : undefined;
  }
  if (event.tool_name === "Read") {
    if (path === undefined) return "The mutant writer reads only this repository.";
    const role = roleOf(path, roles, root);
    if (role === "test" || role === "test-support") {
      return "The mutant writer never reads tests or their support files.";
    }
    return undefined;
  }
  if (event.tool_name === "Write" || event.tool_name === "Edit") {
    if (path !== undefined && roleOf(path, roles, root) === "mutants") return undefined;
    return "The mutant writer writes only the mutants.json beside a spec.";
  }
  // Claude Code delivers a subagent's report through this tool.
  if (event.tool_name === "SubagentHandback") return undefined;
  return `The mutant writer can't use ${event.tool_name ?? "this tool"}.`;
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const root =
    process.env["CLAUDE_PROJECT_DIR"] ?? (JSON.parse(input) as HookInput).cwd ?? process.cwd();
  const reason = blockReasonOf(input, root, process.env);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exitCode = 2;
  }
}
