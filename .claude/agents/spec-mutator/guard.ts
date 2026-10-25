import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string; command?: string };
  cwd?: string;
};

const READABLE = /^(src|specs)(\/|$)/u;
const TEST_FILE = /\.(test|fixtures)\.ts$/u;
const MUTANTS_FILE = /^specs\/.+\/mutants\.json$/u;
const CHECK_COMMAND = /^pnpm spec:mutants:check [a-z0-9-]+$/u;

export function blockReasonOf(input: string, root: string): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);

  if (event.tool_name === "Read" || event.tool_name === "Glob") {
    if (path === undefined || !READABLE.test(path)) {
      return "The spec mutator reads only src/ and specs/. Pass a path under one of them.";
    }
    if (TEST_FILE.test(path)) return "The spec mutator never reads tests.";
    return undefined;
  }
  if (event.tool_name === "Write" || event.tool_name === "Edit") {
    if (path !== undefined && MUTANTS_FILE.test(path)) return undefined;
    return "The spec mutator writes only specs/**/mutants.json.";
  }
  if (event.tool_name === "Bash") {
    if (CHECK_COMMAND.test(event.tool_input?.command?.trim() ?? "")) return undefined;
    return "The spec mutator can run only `pnpm spec:mutants:check <subject>`.";
  }
  return `The spec mutator can't use ${event.tool_name ?? "this tool"}.`;
}

function repoPathOf(toolPath: string, root: string): string {
  return relative(root, isAbsolute(toolPath) ? toolPath : resolve(root, toolPath)).replaceAll(
    "\\",
    "/",
  );
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const root =
    process.env["CLAUDE_PROJECT_DIR"] ?? (JSON.parse(input) as HookInput).cwd ?? process.cwd();
  const reason = blockReasonOf(input, root);
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exitCode = 2;
  }
}
