import { readdirSync, readFileSync } from "node:fs";
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

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRECTORIES.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}
