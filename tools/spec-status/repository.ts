import { execFileSync } from "node:child_process";
import { existsSync, mkdtempDisposableSync, readdirSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

export type Repository = {
  filePaths(): string[];
  read(path: string): string;
};

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git"]);

export function workingTree(root: string): Repository {
  return {
    filePaths() {
      return filesUnder(root).map((path) => relative(root, path).split("\\").join("/"));
    },
    read(path) {
      return readFileSync(join(root, path), "utf8");
    },
  };
}

export function checkOutRevision(root: string, ref: string) {
  const dir = mkdtempDisposableSync(join(tmpdir(), "spec-status-base-"));
  const archive = execFileSync("git", ["archive", "--format=tar", ref], {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
  });
  execFileSync("tar", ["-x", "-C", dir.path], { input: archive });
  // Collecting tests imports them, so the checkout borrows today's dependencies.
  const dependencies = join(root, "node_modules");
  if (existsSync(dependencies)) symlinkSync(dependencies, join(dir.path, "node_modules"), "dir");
  return {
    root: dir.path,
    [Symbol.dispose]() {
      dir.remove();
    },
  };
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}
