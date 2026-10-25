import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?: string;
};

const BUGS_FILE = /^specs\/.+\/bugs\/B\d+\.json$/u;
const TEST_FILE = /\.(test|fixtures)\.ts$/u;

export function blockReasonOf(input: string, root: string): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);

  if (event.tool_name === "Read" || event.tool_name === "Glob") {
    if (path === undefined || !(path === "src" || path.startsWith("src/"))) {
      return "The row bug writer reads only src/. Pass a path under src/.";
    }
    if (event.tool_name === "Read" && TEST_FILE.test(path)) {
      return "The row bug writer never reads tests. Work from the row and the code.";
    }
    return undefined;
  }
  if (event.tool_name === "Write") {
    if (path !== undefined && BUGS_FILE.test(path)) return undefined;
    return "The row bug writer writes only specs/**/bugs/B<n>.json.";
  }
  return `The row bug writer can't use ${event.tool_name ?? "this tool"}.`;
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
