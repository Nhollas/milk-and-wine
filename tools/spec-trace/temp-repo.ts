import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempDisposableSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function createTempRepo() {
  const dir = mkdtempDisposableSync(join(tmpdir(), "spec-trace-"));
  const root = dir.path;

  function write(path: string, content: string) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }

  function git(...args: string[]) {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
  }

  return {
    root,
    writeSpec(path: string, rows: SpecRow[]) {
      write(path, specMarkdown(rows));
    },
    writeTests(path: string, tests: FixtureTest[]) {
      write(path, testSource(tests));
    },
    commit(message: string) {
      git("init", "-q", "-b", "main");
      git("add", "-A");
      git(
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.com",
        "commit",
        "-q",
        "-m",
        message,
      );
    },
    [Symbol.dispose]() {
      dir.remove();
    },
  };
}

type SpecRow = [id: string, verified: string, then?: string];

type FixtureTest = { title: string; modifier?: "todo" | "skip" };

function specMarkdown(rows: SpecRow[]): string {
  return [
    "# Widgets",
    "",
    "| Scope | |",
    "| --- | --- |",
    "| **Owns** | Widgets. |",
    "",
    "| ID | Given | When | Then | Verified |",
    "| --- | --- | --- | --- | --- |",
    ...rows.map(
      ([id, verified, then = "Something happens"]) =>
        `| ${id} | A widget exists | It is used | ${then} | ${verified} |`,
    ),
    "",
  ].join("\n");
}

function testSource(tests: FixtureTest[]): string {
  return [
    `import { test } from "vitest";`,
    "",
    ...tests.map(({ title, modifier }) =>
      modifier === "todo"
        ? `test.todo(${JSON.stringify(title)});`
        : `test${modifier ? `.${modifier}` : ""}(${JSON.stringify(title)}, () => {});`,
    ),
    "",
  ].join("\n");
}
