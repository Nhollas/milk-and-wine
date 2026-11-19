import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, join, matchesGlob, posix, relative, resolve, sep } from "node:path";

// Set in env in .claude/settings.json, each to one glob, such as "{src/tests/**,**/*.fixtures.ts}".
const PATTERN_VARIABLES = {
  specs: "SPEC_FILES",
  tests: "TEST_FILES",
  testSupport: "TEST_SUPPORT_FILES",
} as const;

export type FileRoles = Record<keyof typeof PATTERN_VARIABLES, string>;

export type FileRole = "spec" | "mutants" | "test" | "test-support" | "code";

const MUTANTS_FILE = "mutants.json";

export function readFileRoles(env: NodeJS.ProcessEnv): FileRoles | string {
  const { specs, tests, testSupport } = PATTERN_VARIABLES;
  const missing = [specs, tests, testSupport].filter((name) => !env[name]);
  if (missing.length > 0) return `${missing.join(", ")} must be set in .claude/settings.json`;
  return { specs: env[specs] ?? "", tests: env[tests] ?? "", testSupport: env[testSupport] ?? "" };
}

/** A tool's path as one relative to the repository root, or nothing when it's outside it. */
export function repoPathOf(toolPath: string, root: string): string | undefined {
  const path = relative(root, isAbsolute(toolPath) ? toolPath : resolve(root, toolPath))
    .split(sep)
    .join(posix.sep);
  return path === ".." || path.startsWith("../") || isAbsolute(path) ? undefined : path;
}

/** What a file in the repository is, from its path alone. Anything no pattern names is code. */
export function roleOf(path: string, roles: FileRoles, root: string): FileRole {
  if (matchesGlob(path, roles.specs)) return "spec";
  if (posix.basename(path) === MUTANTS_FILE && isBesideASpec(path, roles, root)) return "mutants";
  if (matchesGlob(path, roles.tests)) return "test";
  if (matchesGlob(path, roles.testSupport)) return "test-support";
  return "code";
}

function isBesideASpec(path: string, roles: FileRoles, root: string): boolean {
  const folder = posix.dirname(path);
  if (!existsSync(join(root, folder))) return false;
  return readdirSync(join(root, folder)).some((name) =>
    matchesGlob(posix.join(folder, name), roles.specs),
  );
}
