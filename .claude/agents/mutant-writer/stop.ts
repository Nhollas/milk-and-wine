import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { readFileRoles, roleOf } from "../../../tools/file-roles/file-roles.ts";

type HookInput = { cwd?: string };

export function failedChecksOf(root: string, env: NodeJS.ProcessEnv): string {
  const roles = readFileRoles(env);
  if (typeof roles === "string") return `${roles}\n`;

  const changed = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter((path) => path !== "");
  // A subject is named for the folder its spec and mutants.json sit in.
  const subjects = changed
    .filter((path) => roleOf(path, roles, root) === "mutants")
    .map((path) => posix.basename(posix.dirname(path)));

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
  const failures = failedChecksOf(root, process.env);
  if (failures) {
    process.stderr.write(`Fix these before you finish:\n${failures}`);
    process.exitCode = 2;
  }
}
