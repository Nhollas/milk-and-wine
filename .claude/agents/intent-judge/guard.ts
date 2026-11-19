import { readFileSync } from "node:fs";
import {
  type FileRole,
  readFileRoles,
  repoPathOf,
  roleOf,
} from "../../../tools/file-roles/file-roles.ts";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?: string;
};

type Rule = { allows: string; tool: string; path?: (path: string | undefined) => boolean };

const READABLE_ROLES = new Set<FileRole>(["spec", "test", "test-support"]);

export function blockReasonOf(
  input: string,
  root: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const roles = readFileRoles(env);
  if (typeof roles === "string") return `The intent judge can't tell what any file is: ${roles}.`;

  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);

  // Everything the intent judge may do. A tool call no rule allows is blocked.
  const rules: Rule[] = [
    {
      allows: `Read specs, tests and their support files, as .claude/settings.json names them; never mutants.json or the code under test`,
      tool: "Read",
      path: (repoPath) =>
        repoPath !== undefined && READABLE_ROLES.has(roleOf(repoPath, roles, root)),
    },
    {
      allows: "Glob anywhere in the repository",
      tool: "Glob",
      path: (repoPath) => toolPath === undefined || repoPath !== undefined,
    },
    // Claude Code delivers a reply in a set shape through StructuredOutput, and a subagent's
    // report through SubagentHandback.
    { allows: "Reply through StructuredOutput", tool: "StructuredOutput" },
    { allows: "Hand back through SubagentHandback", tool: "SubagentHandback" },
  ];

  const allowed = rules.some(
    (rule) => rule.tool === event.tool_name && (rule.path === undefined || rule.path(path)),
  );
  if (allowed) return undefined;

  const call = `${event.tool_name ?? "this tool"}${toolPath === undefined ? "" : ` on ${path ?? toolPath}`}`;
  return [
    `The intent judge can't use ${call}. It may only:`,
    ...rules.map((rule) => `- ${rule.allows}`),
  ].join("\n");
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const event = JSON.parse(input) as HookInput;
  const root = process.env["CLAUDE_PROJECT_DIR"] ?? event.cwd ?? process.cwd();
  const reason = blockReasonOf(input, root, process.env);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exitCode = 2;
  }
}
