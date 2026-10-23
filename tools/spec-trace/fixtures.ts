import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type FixtureTest = { title: string; modifier?: "todo" | "skip" };

export function fixtureRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "spec-trace-"));
  writeFiles(root, files);
  return root;
}

export function writeFiles(root: string, files: Record<string, string | null>): void {
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    if (content === null) {
      rmSync(target);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

export function specFile(rows: [id: string, verified: string, then?: string][]): string {
  return [
    "# Widgets",
    "",
    "| Scope | |",
    "| --- | --- |",
    "| **Owns** | Widgets. |",
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(([id, verified, then = "Something happens"]) => `| ${id} | A widget exists | It is used | ${then} | ${verified} |`),
    "",
  ].join("\n");
}

export function testFile(tests: FixtureTest[]): string {
  return [
    `import { test } from "vitest";`,
    "",
    ...tests.map(({ title, modifier }) =>
      modifier === "todo" ? `test.todo(${JSON.stringify(title)});` : `test${modifier ? `.${modifier}` : ""}(${JSON.stringify(title)}, () => {});`,
    ),
    "",
  ].join("\n");
}

export function commitAll(root: string, message: string): void {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-q", "-m", message);
}
