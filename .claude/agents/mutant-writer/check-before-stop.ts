import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

type HookInput = { cwd?: string };

const MUTANTS_FILE = /^specs\/(?:.+\/)?([^/]+)\/mutants\.json$/u;

export function failedChecksOf(root: string): string {
  const changed = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all", "--", "specs"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\n")
    .map((line) => line.slice(3).trim());
  const subjects = changed.flatMap((path) => MUTANTS_FILE.exec(path)?.[1] ?? []);

  return subjects
    .map((subject) =>
      spawnSync("node", ["tools/spec-mutants/check.ts", subject], { cwd: root, encoding: "utf8" }),
    )
    .filter((result) => result.status !== 0)
    .map((result) => result.stdout)
    .join("\n");
}

if (import.meta.main) {
  const input = readFileSync(0, "utf8");
  const root =
    process.env["CLAUDE_PROJECT_DIR"] ?? (JSON.parse(input) as HookInput).cwd ?? process.cwd();
  const failures = failedChecksOf(root);
  if (failures) {
    process.stderr.write(`Fix these before you finish:\n${failures}`);
    process.exitCode = 2;
  }
}
