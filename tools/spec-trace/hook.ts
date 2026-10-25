import { readFileSync } from "node:fs";
import { isAbsolute, relative } from "node:path";
import { subjectOfSpecPath } from "./specs.ts";
import { runStatus } from "./status.ts";

type HookInput = {
  tool_name?: string;
  tool_input?: { file_path?: string };
  agent_type?: string;
  cwd?: string;
};

const AGENTS_KEPT_FROM_TEST_NAMES = new Set(["spec-mutator"]);

export function runHook(input: string, root: string): string {
  const event = JSON.parse(input) as HookInput;
  const filePath = event.tool_input?.file_path;
  if (event.tool_name !== "Read" || !filePath) return "";
  if (AGENTS_KEPT_FROM_TEST_NAMES.has(event.agent_type ?? "")) return "";

  const subject = subjectOfSpecPath(isAbsolute(filePath) ? relative(root, filePath) : filePath);
  if (!subject) return "";

  const status = runStatus([subject], root);
  if (status.exitCode !== 0) return "";

  const additionalContext = [
    `Delivery status of this spec, from \`pnpm spec:status ${subject}\`.`,
    "A proposed row describes behaviour that is not built yet. Don't rely on it existing.",
    "",
    status.output,
  ].join("\n");
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext },
  });
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const root =
    process.env["CLAUDE_PROJECT_DIR"] ?? (JSON.parse(input) as HookInput).cwd ?? process.cwd();
  process.stdout.write(runHook(input, root));
}
