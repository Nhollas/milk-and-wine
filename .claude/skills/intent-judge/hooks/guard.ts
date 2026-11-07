import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string; path?: string };
  cwd?: string;
  agent_type?: string;
};

// A plugin's hooks run in every session that loads it; this one guards only the judge's own calls.
const JUDGE = /^(intent-judge:)?intent-judge$/u;

const READABLE = /^(src|specs|tests|tools)(\/|$)/u;
const TEST_FILE = /\.test\.ts$/u;

export function blockReasonOf(input: string, root: string): string | undefined {
  const event = JSON.parse(input) as HookInput;
  const toolPath = event.tool_input?.file_path ?? event.tool_input?.path;
  const path = toolPath === undefined ? undefined : repoPathOf(toolPath, root);

  if (event.tool_name === "Read" || event.tool_name === "Glob") {
    if (path === undefined || !READABLE.test(path)) {
      return "The intent judge reads only specs/, tests/ and tests in src/ and tools/. Pass a path under one of them.";
    }
    const isCode = path.startsWith("src/") || path.startsWith("tools/");
    if (event.tool_name === "Read" && isCode && !TEST_FILE.test(path)) {
      return "The intent judge never reads the code under test, only tests.";
    }
    if (event.tool_name === "Read" && path.endsWith("/mutants.json")) {
      return "The intent judge never reads mutants.json.";
    }
    return undefined;
  }
  // Claude Code delivers a reply in a set shape through StructuredOutput, and a subagent's
  // report through SubagentHandback.
  if (event.tool_name === "StructuredOutput" || event.tool_name === "SubagentHandback") {
    return undefined;
  }
  return `The intent judge can't use ${event.tool_name ?? "this tool"}.`;
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
  const reason = JUDGE.test(event.agent_type ?? "") ? blockReasonOf(input, root) : undefined;
  if (reason) {
    process.stderr.write(`${reason}\n`);
    process.exitCode = 2;
  }
}
