import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?: string;
};

type Rule = { allows: string; tool: string; path?: (path: string) => boolean };

const IN_SPECS_OR_TESTS = /^(specs|tests)(\/|$)/u;
const TEST_IN_CODE = /^(src|tools)\/.*\.test\.ts$/u;
const IN_READABLE = /^(src|specs|tests|tools)(\/|$)/u;
const MUTANTS_FILE = /\/mutants\.json$/u;

// Everything the intent judge may do. A tool call no rule allows is blocked.
const RULES: Rule[] = [
  {
    allows: "Read files in specs/ and tests/, except mutants.json",
    tool: "Read",
    path: (path) => IN_SPECS_OR_TESTS.test(path) && !MUTANTS_FILE.test(path),
  },
  {
    allows: "Read *.test.ts files in src/ and tools/, never the code they test",
    tool: "Read",
    path: (path) => TEST_IN_CODE.test(path),
  },
  {
    allows: "Glob in src/, specs/, tests/ or tools/",
    tool: "Glob",
    path: (path) => IN_READABLE.test(path),
  },
  // Claude Code delivers a reply in a set shape through StructuredOutput, and a subagent's
  // report through SubagentHandback.
  { allows: "Reply through StructuredOutput", tool: "StructuredOutput" },
  { allows: "Hand back through SubagentHandback", tool: "SubagentHandback" },
];

export function blockReasonOf(input: string, root: string): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);

  const allowed = RULES.some(
    (rule) =>
      rule.tool === event.tool_name &&
      (rule.path === undefined || (path !== undefined && rule.path(path))),
  );
  if (allowed) return undefined;

  const call = `${event.tool_name ?? "this tool"}${path === undefined ? "" : ` on ${path}`}`;
  return [
    `The intent judge can't use ${call}. It may only:`,
    ...RULES.map((rule) => `- ${rule.allows}`),
  ].join("\n");
}

function repoPathOf(toolPath: string, root: string): string {
  return relative(root, isAbsolute(toolPath) ? toolPath : resolve(root, toolPath)).replaceAll(
    "\\",
    "/",
  );
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const event = JSON.parse(input) as HookInput;
  const root = process.env["CLAUDE_PROJECT_DIR"] ?? event.cwd ?? process.cwd();
  const reason = blockReasonOf(input, root);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exitCode = 2;
  }
}
