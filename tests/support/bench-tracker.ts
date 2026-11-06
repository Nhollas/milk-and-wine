import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const issueTrackerDirectory = join(import.meta.dirname, "../../docs/agents/issue-tracker");

export function git(repository: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

export function newRepositoryOnMain(): string {
  const repository = mkdtempSync(join(tmpdir(), "bench-tracker-"));
  git(repository, "init", "--initial-branch=main");
  git(repository, "config", "user.name", "Trial");
  git(repository, "config", "user.email", "trial@example.com");
  git(repository, "commit", "--allow-empty", "-m", "start");
  return repository;
}

export function benchInstructions(): string {
  try {
    return execFileSync("sh", [join(issueTrackerDirectory, "active.sh")], {
      encoding: "utf8",
      env: { ...process.env, ISSUE_TRACKER: "bench" },
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/** The shell commands in the fenced block under an instruction's heading, with `<name>` placeholders filled in. */
export function commandsUnder(
  instructions: string,
  heading: string,
  placeholders: Record<string, string>,
): string {
  const section = instructions.split(`### ${heading}`)[1]?.split("\n### ")[0] ?? "";
  const block = /```(?:sh|bash|shell)?\n([\s\S]*?)```/u.exec(section)?.[1] ?? "";
  return Object.entries(placeholders).reduce(
    (commands, [name, value]) => commands.replaceAll(`<${name}>`, value),
    block,
  );
}

export function run(repository: string, commands: string): void {
  execFileSync("sh", ["-ec", commands], { cwd: repository, stdio: "ignore" });
}
